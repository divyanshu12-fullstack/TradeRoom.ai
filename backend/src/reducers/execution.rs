use spacetimedb::{reducer, ReducerContext, Table};

use crate::common::time::now_secs;
use crate::schema::accessors::*;
use crate::schema::context::SharedContext;
use crate::schema::logs::DecisionLog;
use crate::schema::trade::TradeProposal;

pub fn can_execute(cro_approved: bool, override_by: &str, override_reason: &str) -> bool {
    if cro_approved {
        return true;
    }

    !override_by.trim().is_empty() && !override_reason.trim().is_empty()
}

#[reducer]
pub fn manual_execute_trade(
    ctx: &ReducerContext,
    proposal_id: String,
    override_by: String,
    override_reason: String,
) -> Result<(), String> {
    let now = now_secs(ctx);
    let mut proposal = ctx
        .db
        .trade_proposal()
        .proposal_id()
        .find(proposal_id.clone())
        .ok_or_else(|| "proposal not found".to_string())?;

    if proposal.status == "closed" {
        return Err("trade is already closed".to_string());
    }

    if !can_execute(proposal.cro_approved, &override_by, &override_reason) {
        return Err("trade blocked by CRO veto".to_string());
    }

    proposal.status = "executed".to_string();
    proposal.executed_at = now;
    proposal.updated_at = now;

    if !proposal.cro_approved {
        proposal.override_by = override_by.clone();
        proposal.override_reason = override_reason.clone();
        proposal.override_at = now;
    }

    ctx.db.trade_proposal().proposal_id().delete(proposal_id.clone());
    ctx.db.trade_proposal().insert(proposal.clone());

    let verdict = if proposal.cro_approved {
        "EXECUTED"
    } else {
        "EXECUTED_WITH_OVERRIDE"
    };

    let summary = if proposal.cro_approved {
        format!("{} {} size {}", proposal.side, proposal.symbol, proposal.size)
    } else {
        format!(
            "{} {} size {} | override by {}: {}",
            proposal.side, proposal.symbol, proposal.size, override_by, override_reason
        )
    };

    ctx.db.decision_log().insert(DecisionLog {
        id: 0,
        proposal_id: proposal_id.clone(),
        verdict: verdict.to_string(),
        summary: summary.clone(),
        confidence: proposal.confidence_hint(),
        timestamp: now,
    });

    ctx.db.shared_context().key().delete("trade_decision".to_string());
    ctx.db.shared_context().insert(SharedContext {
        key: "trade_decision".to_string(),
        value: summary,
        updated_at: now,
    });

    Ok(())
}

trait ProposalConfidence {
    fn confidence_hint(&self) -> f32;
}

impl ProposalConfidence for TradeProposal {
    fn confidence_hint(&self) -> f32 {
        if self.cro_approved { 0.9 } else { 0.6 }
    }
}
