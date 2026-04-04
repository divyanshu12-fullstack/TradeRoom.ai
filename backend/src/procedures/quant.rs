use serde_json::Value;
use spacetimedb::{http::Request, ProcedureContext, Table};

use crate::common::constants::{gemini_api_key, gemini_model_name, GEMINI_URL};
use crate::common::time::now_secs_proc;
use crate::integrations::gemini::{build_gemini_request, extract_gemini_text};
use crate::integrations::mem0::{add_mem0_memory, retrieve_mem0_insights};
use crate::schema::accessors::*;
use crate::schema::agent::Agent;
use crate::schema::context::SharedContext;
use crate::schema::logs::ReasoningLog;
use crate::schema::memory::StructuredMemory;
use crate::schema::messages::AgentMessage;
use crate::schema::schedule::QuantSchedule;
use crate::schema::trade::TradeProposal;

#[spacetimedb::procedure]
pub fn quant_think(ctx: &mut ProcedureContext, _arg: QuantSchedule) {
    log::info!("[quant] think cycle starting");
    let (symbol, pattern, pass_no, proposal_id, ticker_text, unread) = ctx.with_tx(|tx_ctx| {
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

        let ticker_text = tx_ctx
            .db
            .market_ticker()
            .symbol()
            .find(symbol.clone())
            .map(|t| {
                format!(
                    "price {:.4}, vol24h {:.2}, volatility {:.4}, sentiment {:.4}",
                    t.price, t.volume_24h, t.volatility, t.sentiment
                )
            })
            .unwrap_or_else(|| "ticker missing".to_string());

        let unread: Vec<AgentMessage> = tx_ctx
            .db
            .agent_messages()
            .iter()
            .filter(|m| m.to_agent == "quant" && !m.is_read)
            .collect();

        (symbol, pattern, pass_no, proposal_id, ticker_text, unread)
    });

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

    let mem = retrieve_mem0_insights(ctx, &format!("{} {} {}", symbol, pattern, ticker_text), "agent_quant");

    let prompt = format!(
        "SYMBOL: {}\nPASS: {}\nPATTERN: {}\nTICK: {}\n\nMEM:\n{}\n\nMSGS:\n{}\n\nGive quant thesis.",
        symbol, pass_no, pattern, ticker_text, mem, msg_text
    );

    let system_instruction = "You are Quant. Return JSON keys: reasoning, thesis, confidence, risk_flags, decision_bias, predicted_outcome, memory_to_store, message_to_pm.";
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
            log::error!("[quant] Gemini failed: {:?}", e);
            "{\"reasoning\":\"Gemini failed\",\"thesis\":\"hold\",\"confidence\":0.0,\"risk_flags\":\"api_error\",\"decision_bias\":\"neutral\",\"predicted_outcome\":\"unknown\",\"memory_to_store\":\"\",\"message_to_pm\":\"api error\"}".to_string()
        }
    };

    let parsed_txt = extract_gemini_text(&raw).unwrap_or(raw);
    let parsed: Value = serde_json::from_str(&parsed_txt).unwrap_or_else(|_| {
        serde_json::json!({
            "reasoning": "parse_failed",
            "thesis": "hold",
            "confidence": 0.0,
            "risk_flags": "parse_failed",
            "decision_bias": "neutral",
            "predicted_outcome": "unknown",
            "memory_to_store": "",
            "message_to_pm": ""
        })
    });

    let reasoning = parsed["reasoning"].as_str().unwrap_or("parse_failed").to_string();
    let thesis = parsed["thesis"].as_str().unwrap_or("hold").to_string();
    let confidence = parsed["confidence"].as_f64().unwrap_or(0.0).clamp(0.0, 1.0) as f32;
    let risk_flags = parsed["risk_flags"].as_str().unwrap_or("").to_string();
    let predicted_outcome = parsed["predicted_outcome"].as_str().unwrap_or("").to_string();
    let memory_to_store = parsed["memory_to_store"].as_str().unwrap_or("").to_string();
    let message_to_pm = parsed["message_to_pm"].as_str().unwrap_or("").to_string();

    add_mem0_memory(
        ctx,
        &memory_to_store,
        "agent_quant",
        &pattern,
        confidence,
        &predicted_outcome,
    );

    let now = now_secs_proc(ctx);
    ctx.with_tx(|tx_ctx| {
        tx_ctx.db.shared_context().key().delete("quant_thesis".to_string());
        tx_ctx.db.shared_context().insert(SharedContext {
            key: "quant_thesis".to_string(),
            value: thesis.clone(),
            updated_at: now,
        });

        if !memory_to_store.is_empty() {
            tx_ctx.db.structured_memory().insert(StructuredMemory {
                id: 0,
                proposal_id: proposal_id.clone(),
                pattern: pattern.clone(),
                insight: memory_to_store.clone(),
                decision: thesis.clone(),
                confidence,
                predicted_outcome: predicted_outcome.clone(),
                source_agent: "quant".to_string(),
                realized_pnl: 0.0,
                timestamp: now,
            });
        }

        tx_ctx.db.reasoning_log().insert(ReasoningLog {
            log_id: 0,
            proposal_id: proposal_id.clone(),
            cycle_pass: pass_no,
            agent_id: "quant".to_string(),
            reasoning: reasoning.clone(),
            decision: format!("{} | risk:{}", thesis, risk_flags),
            confidence,
            has_conflict: false,
            timestamp: now,
        });

        if !message_to_pm.is_empty() {
            tx_ctx.db.agent_messages().insert(AgentMessage {
                msg_id: 0,
                from_agent: "quant".to_string(),
                to_agent: "portfolio_manager".to_string(),
                content: message_to_pm.clone(),
                is_read: false,
                sent_at: now,
            });
        }

        if let Some(mut p) = tx_ctx.db.trade_proposal().proposal_id().find(proposal_id.clone()) {
            p.quant_thesis = thesis.clone();
            p.cycle_pass = pass_no;
            p.updated_at = now;
            tx_ctx.db.trade_proposal().proposal_id().delete(proposal_id.clone());
            tx_ctx.db.trade_proposal().insert(p);
        } else {
            tx_ctx.db.trade_proposal().insert(TradeProposal {
                proposal_id: proposal_id.clone(),
                symbol: symbol.clone(),
                cycle_pass: pass_no,
                quant_thesis: thesis.clone(),
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
        }

        if let Some(agent) = tx_ctx.db.agent().agent_id().find("quant".to_string()) {
            tx_ctx.db.agent().agent_id().delete("quant".to_string());
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
