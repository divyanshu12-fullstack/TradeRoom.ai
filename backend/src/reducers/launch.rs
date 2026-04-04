use spacetimedb::{reducer, ReducerContext, ScheduleAt, Table};

use crate::common::time::now_secs;
use crate::schema::accessors::*;
use crate::schema::agent::Agent;
use crate::schema::context::SharedContext;
use crate::schema::schedule::PatternSchedule;
use crate::schema::trade::TradeProposal;

#[reducer]
pub fn launch_trade_cycle(ctx: &ReducerContext, symbol: String, market_note: String) {
    let now = now_secs(ctx);
    let now_micros = ctx.timestamp.to_micros_since_unix_epoch() as i64;
    let proposal_id = format!("{}-{}", symbol, now);

    let ids: Vec<_> = ctx.db.pattern_schedule().iter().map(|s| s.scheduled_id).collect();
    for id in ids {
        ctx.db.pattern_schedule().scheduled_id().delete(id);
    }

    let ids: Vec<_> = ctx.db.quant_schedule().iter().map(|s| s.scheduled_id).collect();
    for id in ids {
        ctx.db.quant_schedule().scheduled_id().delete(id);
    }

    let ids: Vec<_> = ctx.db.pm_schedule().iter().map(|s| s.scheduled_id).collect();
    for id in ids {
        ctx.db.pm_schedule().scheduled_id().delete(id);
    }

    let ids: Vec<_> = ctx.db.cro_schedule().iter().map(|s| s.scheduled_id).collect();
    for id in ids {
        ctx.db.cro_schedule().scheduled_id().delete(id);
    }

    let ids: Vec<_> = ctx.db.reasoning_log().iter().map(|r| r.log_id).collect();
    for id in ids {
        ctx.db.reasoning_log().log_id().delete(id);
    }

    let ids: Vec<_> = ctx.db.agent_messages().iter().map(|m| m.msg_id).collect();
    for id in ids {
        ctx.db.agent_messages().msg_id().delete(id);
    }

    let ids: Vec<_> = ctx.db.decision_log().iter().map(|d| d.id).collect();
    for id in ids {
        ctx.db.decision_log().id().delete(id);
    }

    upsert_ctx(ctx, "market_symbol", &symbol, now);
    upsert_ctx(ctx, "market_note", &market_note, now);
    upsert_ctx(ctx, "cycle_pass", "1", now);
    upsert_ctx(ctx, "active_proposal_id", &proposal_id, now);
    ctx.db.shared_context().key().delete("trade_decision".to_string());

    ctx.db.trade_proposal().proposal_id().delete(proposal_id.clone());
    ctx.db.trade_proposal().insert(TradeProposal {
        proposal_id: proposal_id.clone(),
        symbol: symbol.clone(),
        cycle_pass: 1,
        quant_thesis: String::new(),
        pm_plan: String::new(),
        side: "HOLD".to_string(),
        size: 0.0,
        entry_price: 0.0,
        stop_loss: 0.0,
        take_profit: 0.0,
        cro_verdict: "PENDING".to_string(),
        cro_reason: String::new(),
        cro_approved: false,
        status: "draft".to_string(),
        override_by: String::new(),
        override_reason: String::new(),
        override_at: 0,
        executed_at: 0,
        created_at: now,
        updated_at: now,
    });

    for agent_id in ["quant", "portfolio_manager", "cro"] {
        if let Some(agent) = ctx.db.agent().agent_id().find(agent_id.to_string()) {
            ctx.db.agent().agent_id().delete(agent_id.to_string());
            ctx.db.agent().insert(Agent {
                status: "waiting".to_string(),
                current_task: "Waiting for market classification".to_string(),
                confidence: 0.0,
                last_updated: now,
                ..agent
            });
        }
    }

    ctx.db.pattern_schedule().insert(PatternSchedule {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Time(spacetimedb::Timestamp::from_micros_since_unix_epoch(
            now_micros + 100_000,
        )),
    });

    log::info!("[traderoom] cycle launched for {}", symbol);
}

fn upsert_ctx(ctx: &ReducerContext, key: &str, value: &str, now: u64) {
    ctx.db.shared_context().key().delete(key.to_string());
    ctx.db.shared_context().insert(SharedContext {
        key: key.to_string(),
        value: value.to_string(),
        updated_at: now,
    });
}
