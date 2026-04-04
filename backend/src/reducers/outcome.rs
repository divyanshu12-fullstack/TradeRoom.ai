use spacetimedb::{reducer, ReducerContext, Table};

use crate::common::time::now_secs;
use crate::schema::accessors::*;
use crate::schema::memory::StructuredMemory;
use crate::schema::trade::TradeResult;

#[reducer]
pub fn close_trade(
    ctx: &ReducerContext,
    proposal_id: String,
    exit_price: f64,
    realized_pnl: f64,
) -> Result<(), String> {
    let now = now_secs(ctx);

    let mut proposal = ctx
        .db
        .trade_proposal()
        .proposal_id()
        .find(proposal_id.clone())
        .ok_or_else(|| "proposal not found".to_string())?;

    if proposal.status != "executed" {
        return Err("only executed trades can be closed".to_string());
    }

    proposal.status = "closed".to_string();
    proposal.updated_at = now;

    ctx.db.trade_proposal().proposal_id().delete(proposal_id.clone());
    ctx.db.trade_proposal().insert(proposal.clone());

    let hold_secs = if proposal.executed_at > 0 {
        now.saturating_sub(proposal.executed_at)
    } else {
        0
    };

    ctx.db.trade_result().insert(TradeResult {
        id: 0,
        proposal_id: proposal_id.clone(),
        symbol: proposal.symbol.clone(),
        exit_price,
        realized_pnl,
        hold_secs,
        closed_at: now,
    });

    ctx.db.structured_memory().insert(StructuredMemory {
        id: 0,
        proposal_id,
        pattern: "execution_feedback".to_string(),
        insight: format!("Closed {} with PnL {:.2}", proposal.symbol, realized_pnl),
        decision: proposal.pm_plan,
        confidence: 0.8,
        predicted_outcome: "post_trade_feedback".to_string(),
        source_agent: "execution".to_string(),
        realized_pnl,
        timestamp: now,
    });

    Ok(())
}
