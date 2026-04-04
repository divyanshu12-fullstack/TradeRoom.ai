use spacetimedb::{ProcedureContext, ScheduleAt, Table};

use crate::common::time::{now_micros_proc, now_secs_proc};
use crate::schema::accessors::*;
use crate::schema::agent::Agent;
use crate::schema::context::SharedContext;
use crate::schema::logs::DecisionLog;
use crate::schema::schedule::{CroSchedule, PmSchedule, QuantSchedule};

pub fn should_continue_cycles(current_pass: u32) -> bool {
    current_pass < 3
}

pub fn check_and_finalize_cycle(ctx: &mut ProcedureContext) {
    let (all_done, current_pass, proposal_id) = ctx.with_tx(|tx_ctx| {
        let all_done = tx_ctx
            .db
            .agent()
            .iter()
            .all(|a| a.status == "idle" || a.status == "error" || a.status == "paused");

        let current_pass = tx_ctx
            .db
            .shared_context()
            .key()
            .find("cycle_pass".to_string())
            .and_then(|v| v.value.parse::<u32>().ok())
            .unwrap_or(1);

        let proposal_id = tx_ctx
            .db
            .shared_context()
            .key()
            .find("active_proposal_id".to_string())
            .map(|v| v.value)
            .unwrap_or_default();

        (all_done, current_pass, proposal_id)
    });

    if !all_done || proposal_id.is_empty() {
        return;
    }

    if should_continue_cycles(current_pass) {
        let next_pass = current_pass + 1;
        let now = now_secs_proc(ctx);
        let now_micros = now_micros_proc(ctx);

        ctx.with_tx(|tx_ctx| {
            tx_ctx.db.shared_context().key().delete("cycle_pass".to_string());
            tx_ctx.db.shared_context().insert(SharedContext {
                key: "cycle_pass".to_string(),
                value: next_pass.to_string(),
                updated_at: now,
            });

            for id in ["quant", "portfolio_manager", "cro"] {
                if let Some(agent) = tx_ctx.db.agent().agent_id().find(id.to_string()) {
                    tx_ctx.db.agent().agent_id().delete(id.to_string());
                    tx_ctx.db.agent().insert(Agent {
                        status: "thinking".to_string(),
                        current_task: format!("Pass {} of 3", next_pass),
                        last_updated: now,
                        ..agent
                    });
                }
            }

            tx_ctx.db.quant_schedule().insert(QuantSchedule {
                scheduled_id: 0,
                scheduled_at: ScheduleAt::Time(spacetimedb::Timestamp::from_micros_since_unix_epoch(
                    now_micros + 500_000,
                )),
            });
            tx_ctx.db.pm_schedule().insert(PmSchedule {
                scheduled_id: 0,
                scheduled_at: ScheduleAt::Time(spacetimedb::Timestamp::from_micros_since_unix_epoch(
                    now_micros + 4_500_000,
                )),
            });
            tx_ctx.db.cro_schedule().insert(CroSchedule {
                scheduled_id: 0,
                scheduled_at: ScheduleAt::Time(spacetimedb::Timestamp::from_micros_since_unix_epoch(
                    now_micros + 8_500_000,
                )),
            });
        });

        return;
    }

    let now = now_secs_proc(ctx);
    ctx.with_tx(|tx_ctx| {
        if let Some(proposal) = tx_ctx.db.trade_proposal().proposal_id().find(proposal_id.clone()) {
            let verdict = if proposal.cro_approved { "APPROVED" } else { "VETOED" };
            let summary = format!(
                "{} {} size {:.4} | reason: {}",
                proposal.side,
                proposal.symbol,
                proposal.size,
                if proposal.cro_reason.is_empty() {
                    "no extra note"
                } else {
                    proposal.cro_reason.as_str()
                }
            );

            tx_ctx.db.shared_context().key().delete("trade_decision".to_string());
            tx_ctx.db.shared_context().insert(SharedContext {
                key: "trade_decision".to_string(),
                value: format!("{} - {}", verdict, summary),
                updated_at: now,
            });

            tx_ctx.db.decision_log().insert(DecisionLog {
                id: 0,
                proposal_id: proposal_id.clone(),
                verdict: verdict.to_string(),
                summary,
                confidence: if proposal.cro_approved { 0.9 } else { 0.65 },
                timestamp: now,
            });
        }
    });
}
