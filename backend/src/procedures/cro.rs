use serde_json::Value;
use spacetimedb::{http::Request, ProcedureContext, Table};

use crate::common::constants::{gemini_api_key, gemini_model_name, GEMINI_URL};
use crate::common::time::now_secs_proc;
use crate::integrations::gemini::{build_gemini_request, extract_gemini_text};
use crate::integrations::mem0::{add_mem0_memory, retrieve_mem0_insights};
use crate::schema::accessors::*;
use crate::schema::agent::Agent;
use crate::schema::logs::ReasoningLog;
use crate::schema::memory::StructuredMemory;
use crate::schema::messages::AgentMessage;
use crate::schema::schedule::CroSchedule;

#[spacetimedb::procedure]
pub fn cro_think(ctx: &mut ProcedureContext, _arg: CroSchedule) {
    log::info!("[cro] think cycle starting");
    let (symbol, pattern, pass_no, proposal_id, proposal_text, max_size, max_vol, vol_now, unread) =
        ctx.with_tx(|tx_ctx| {
            let symbol = tx_ctx
                .db
                .shared_context()
                .key()
                .find("market_symbol".to_string())
                .map(|v| v.value)
                .unwrap_or_else(|| "BTCUSDT".to_string());

            let pattern = tx_ctx
                .db
                .shared_context()
                .key()
                .find("market_pattern".to_string())
                .map(|v| v.value)
                .unwrap_or_else(|| "unknown".to_string());

            let pass_no = tx_ctx
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

            let proposal_text = tx_ctx
                .db
                .trade_proposal()
                .proposal_id()
                .find(proposal_id.clone())
                .map(|p| {
                    format!(
                        "side={} size={} entry={} sl={} tp={} thesis={} plan={}",
                        p.side, p.size, p.entry_price, p.stop_loss, p.take_profit, p.quant_thesis, p.pm_plan
                    )
                })
                .unwrap_or_else(|| "proposal missing".to_string());

            let max_size = tx_ctx
                .db
                .risk_limit()
                .key()
                .find("max_position_size".to_string())
                .map(|r| r.value)
                .unwrap_or(1.0);

            let max_vol = tx_ctx
                .db
                .risk_limit()
                .key()
                .find("max_volatility".to_string())
                .map(|r| r.value)
                .unwrap_or(0.12);

            let vol_now = tx_ctx
                .db
                .market_ticker()
                .symbol()
                .find(symbol.clone())
                .map(|t| t.volatility as f64)
                .unwrap_or(0.0);

            let unread: Vec<AgentMessage> = tx_ctx
                .db
                .agent_messages()
                .iter()
                .filter(|m| m.to_agent == "cro" && !m.is_read)
                .collect();

            (
                symbol,
                pattern,
                pass_no,
                proposal_id,
                proposal_text,
                max_size,
                max_vol,
                vol_now,
                unread,
            )
        });

    if proposal_id.is_empty() {
        return;
    }

    ctx.with_tx(|tx_ctx| {
        for msg in &unread {
            tx_ctx.db.agent_messages().msg_id().delete(msg.msg_id);
            tx_ctx
                .db
                .agent_messages()
                .insert(AgentMessage { is_read: true, ..msg.clone() });
        }
    });

    let msg_text = if unread.is_empty() {
        "No new messages".to_string()
    } else {
        unread
            .iter()
            .map(|m| format!("From {}: {}", m.from_agent, m.content))
            .collect::<Vec<_>>()
            .join("\n")
    };

    let mem = retrieve_mem0_insights(
        ctx,
        &format!("{} {} proposal {}", symbol, pattern, proposal_text),
        "agent_cro",
    );

    let prompt = format!(
        "SYMBOL: {}\nPASS: {}\nPATTERN: {}\nPROPOSAL: {}\nRISK max_size={} max_vol={} now_vol={}\n\nMEM:\n{}\n\nMSGS:\n{}\n\nReturn approve or veto.",
        symbol, pass_no, pattern, proposal_text, max_size, max_vol, vol_now, mem, msg_text
    );

    let system_instruction = "You are CRO. Return JSON keys: reasoning, verdict, confidence, veto_reason, risk_flags, predicted_outcome, memory_to_store, message_to_pm. verdict must be APPROVE or VETO.";
    let url = format!("{}{}:generateContent?key={}", GEMINI_URL, gemini_model_name(), gemini_api_key());
    let body = build_gemini_request(&prompt, system_instruction);

    let raw = match ctx.http.send(
        Request::builder()
            .method("POST")
            .uri(&url)
            .header("Content-Type", "application/json")
            .body(body)
            .unwrap(),
    ) {
        Ok(resp) => resp.into_parts().1.into_string_lossy(),
        Err(e) => {
            log::error!("[cro] Gemini failed: {:?}", e);
            "{\"reasoning\":\"Gemini failed\",\"verdict\":\"VETO\",\"confidence\":0.0,\"veto_reason\":\"api_error\",\"risk_flags\":\"api_error\",\"predicted_outcome\":\"unknown\",\"memory_to_store\":\"\",\"message_to_pm\":\"api error\"}".to_string()
        }
    };

    let parsed_txt = extract_gemini_text(&raw).unwrap_or(raw);
    let parsed: Value = serde_json::from_str(&parsed_txt).unwrap_or_else(|_| {
        serde_json::json!({
            "reasoning": "parse_failed",
            "verdict": "VETO",
            "confidence": 0.0,
            "veto_reason": "parse_failed",
            "risk_flags": "parse_failed",
            "predicted_outcome": "unknown",
            "memory_to_store": "",
            "message_to_pm": ""
        })
    });

    let reasoning = parsed["reasoning"].as_str().unwrap_or("parse_failed").to_string();
    let mut verdict = parsed["verdict"]
        .as_str()
        .unwrap_or("VETO")
        .to_uppercase();
    let confidence = parsed["confidence"].as_f64().unwrap_or(0.0).clamp(0.0, 1.0) as f32;
    let mut veto_reason = parsed["veto_reason"].as_str().unwrap_or("").to_string();
    let risk_flags = parsed["risk_flags"].as_str().unwrap_or("").to_string();
    let predicted_outcome = parsed["predicted_outcome"].as_str().unwrap_or("").to_string();
    let memory_to_store = parsed["memory_to_store"].as_str().unwrap_or("").to_string();
    let message_to_pm = parsed["message_to_pm"].as_str().unwrap_or("").to_string();

    let mut approved = verdict == "APPROVE";
    let hard_limit_hit = ctx.with_tx(|tx_ctx| {
        tx_ctx
            .db
            .trade_proposal()
            .proposal_id()
            .find(proposal_id.clone())
            .map(|p| p.size > max_size || vol_now > max_vol)
            .unwrap_or(true)
    });

    if hard_limit_hit {
        approved = false;
        verdict = "VETO".to_string();
        if veto_reason.is_empty() {
            veto_reason = "hard risk limit breach".to_string();
        } else {
            veto_reason = format!("{} | hard risk limit breach", veto_reason);
        }
    }

    add_mem0_memory(
        ctx,
        &memory_to_store,
        "agent_cro",
        &pattern,
        confidence,
        &predicted_outcome,
    );

    let now = now_secs_proc(ctx);
    ctx.with_tx(|tx_ctx| {
        if !memory_to_store.is_empty() {
            tx_ctx.db.structured_memory().insert(StructuredMemory {
                id: 0,
                proposal_id: proposal_id.clone(),
                pattern: pattern.clone(),
                insight: memory_to_store.clone(),
                decision: format!("{} {}", verdict, veto_reason),
                confidence,
                predicted_outcome: predicted_outcome.clone(),
                source_agent: "cro".to_string(),
                realized_pnl: 0.0,
                timestamp: now,
            });
        }

        tx_ctx.db.reasoning_log().insert(ReasoningLog {
            log_id: 0,
            proposal_id: proposal_id.clone(),
            cycle_pass: pass_no,
            agent_id: "cro".to_string(),
            reasoning: reasoning.clone(),
            decision: format!("{} {} | flags:{}", verdict, veto_reason, risk_flags),
            confidence,
            has_conflict: !approved,
            timestamp: now,
        });

        if let Some(mut p) = tx_ctx.db.trade_proposal().proposal_id().find(proposal_id.clone()) {
            p.cycle_pass = pass_no;
            p.cro_verdict = verdict.clone();
            p.cro_reason = veto_reason.clone();
            p.cro_approved = approved;
            p.status = if approved {
                "approved".to_string()
            } else {
                "vetoed".to_string()
            };
            p.updated_at = now;
            tx_ctx.db.trade_proposal().proposal_id().delete(proposal_id.clone());
            tx_ctx.db.trade_proposal().insert(p);
        }

        if !message_to_pm.is_empty() {
            tx_ctx.db.agent_messages().insert(AgentMessage {
                msg_id: 0,
                from_agent: "cro".to_string(),
                to_agent: "portfolio_manager".to_string(),
                content: message_to_pm.clone(),
                is_read: false,
                sent_at: now,
            });
        }

        tx_ctx.db.shared_context().key().delete("cro_verdict".to_string());
        tx_ctx.db.shared_context().insert(crate::schema::context::SharedContext {
            key: "cro_verdict".to_string(),
            value: verdict.clone(),
            updated_at: now,
        });

        if let Some(agent) = tx_ctx.db.agent().agent_id().find("cro".to_string()) {
            tx_ctx.db.agent().agent_id().delete("cro".to_string());
            tx_ctx.db.agent().insert(Agent {
                status: "idle".to_string(),
                confidence,
                last_updated: now,
                ..agent
            });
        }
    });

    crate::procedures::cycle::check_and_finalize_cycle(ctx);
}
