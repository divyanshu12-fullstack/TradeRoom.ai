use spacetimedb::{reducer, ReducerContext, Table};

use crate::common::time::now_secs;
use crate::schema::accessors::*;
use crate::schema::agent::Agent;
use crate::schema::context::SharedContext;
use crate::schema::risk::RiskLimit;

#[reducer(init)]
pub fn init(ctx: &ReducerContext) {
    let now = now_secs(ctx);

    ctx.db.agent().insert(Agent {
        agent_id: "quant".to_string(),
        agent_type: "signal".to_string(),
        status: "idle".to_string(),
        current_task: "Waiting for market launch".to_string(),
        confidence: 0.0,
        last_updated: now,
    });

    ctx.db.agent().insert(Agent {
        agent_id: "portfolio_manager".to_string(),
        agent_type: "allocation".to_string(),
        status: "idle".to_string(),
        current_task: "Waiting for quant thesis".to_string(),
        confidence: 0.0,
        last_updated: now,
    });

    ctx.db.agent().insert(Agent {
        agent_id: "cro".to_string(),
        agent_type: "risk".to_string(),
        status: "idle".to_string(),
        current_task: "Waiting for PM plan".to_string(),
        confidence: 0.0,
        last_updated: now,
    });

    ctx.db.shared_context().insert(SharedContext {
        key: "market_symbol".to_string(),
        value: "BTCUSDT".to_string(),
        updated_at: now,
    });

    ctx.db.shared_context().insert(SharedContext {
        key: "cycle_pass".to_string(),
        value: "1".to_string(),
        updated_at: now,
    });

    for (k, v) in [
        ("max_position_size", 1.0_f64),
        ("max_daily_loss", 1500.0_f64),
        ("max_volatility", 0.12_f64),
    ] {
        ctx.db.risk_limit().insert(RiskLimit {
            key: k.to_string(),
            value: v,
            updated_at: now,
        });
    }

    log::info!("[traderoom] init complete");
}
