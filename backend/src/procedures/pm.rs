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
use crate::schema::schedule::PmSchedule;

#[spacetimedb::procedure]
pub fn portfolio_manager_think(ctx: &mut ProcedureContext, _arg: PmSchedule) {
    let (symbol, pattern, pass_no, proposal_id, thesis, ticker_text, limits_text, unread) =
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

            let thesis = tx_ctx
                .db
                .shared_context()
                .key()
                .find("quant_thesis".to_string())
                .map(|v| v.value)
                .unwrap_or_else(|| "no thesis".to_string());

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

            let limits_text = tx_ctx
                .db
                .risk_limit()
                .iter()
                .map(|r| format!("{}={:.4}", r.key, r.value))
                .collect::<Vec<_>>()
                .join(", ");

            let unread: Vec<AgentMessage> = tx_ctx
                .db
                .agent_messages()
                .iter()
                .filter(|m| m.to_agent == "portfolio_manager" && !m.is_read)
                .collect();

            (
                symbol,
                pattern,
                pass_no,
                proposal_id,
                thesis,
                ticker_text,
                limits_text,
                unread,
            )
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

    let mem = retrieve_mem0_insights(
        ctx,
        &format!("{} {} thesis:{}", symbol, pattern, thesis),
        "agent_portfolio_manager",
    );

    let prompt = format!(
        "SYMBOL: {}\nPASS: {}\nPATTERN: {}\nTICK: {}\nTHESIS: {}\nLIMITS: {}\n\nMEM:\n{}\n\nMSGS:\n{}\n\nBuild position plan.",
        symbol, pass_no, pattern, ticker_text, thesis, limits_text, mem, msg_text
    );

    let system_instruction = "You are Portfolio Manager. Return JSON keys: reasoning, plan, confidence, proposed_side, proposed_size, entry_price, stop_loss, take_profit, predicted_outcome, memory_to_store, message_to_cro.";
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
            log::error!("[pm] Gemini failed: {:?}", e);
            "{\"reasoning\":\"Gemini failed\",\"plan\":\"hold\",\"confidence\":0.0,\"proposed_side\":\"HOLD\",\"proposed_size\":0.0,\"entry_price\":0.0,\"stop_loss\":0.0,\"take_profit\":0.0,\"predicted_outcome\":\"unknown\",\"memory_to_store\":\"\",\"message_to_cro\":\"api error\"}".to_string()
        }
    };

    let parsed_txt = extract_gemini_text(&raw).unwrap_or(raw);
    let parsed: Value = serde_json::from_str(&parsed_txt).unwrap_or_else(|_| {
        serde_json::json!({
            "reasoning": "parse_failed",
            "plan": "hold",
            "confidence": 0.0,
            "proposed_side": "HOLD",
            "proposed_size": 0.0,
            "entry_price": 0.0,
            "stop_loss": 0.0,
            "take_profit": 0.0,
            "predicted_outcome": "unknown",
            "memory_to_store": "",
            "message_to_cro": ""
        })
    });

    let reasoning = parsed["reasoning"].as_str().unwrap_or("parse_failed").to_string();
    let plan = parsed["plan"].as_str().unwrap_or("hold").to_string();
    let confidence = parsed["confidence"].as_f64().unwrap_or(0.0).clamp(0.0, 1.0) as f32;
    let side = parsed["proposed_side"].as_str().unwrap_or("HOLD").to_string();
    let size = parsed["proposed_size"].as_f64().unwrap_or(0.0).max(0.0);
    let entry = parsed["entry_price"].as_f64().unwrap_or(0.0);
    let stop_loss = parsed["stop_loss"].as_f64().unwrap_or(0.0);
    let take_profit = parsed["take_profit"].as_f64().unwrap_or(0.0);
    let predicted_outcome = parsed["predicted_outcome"].as_str().unwrap_or("").to_string();
    let memory_to_store = parsed["memory_to_store"].as_str().unwrap_or("").to_string();
    let message_to_cro = parsed["message_to_cro"].as_str().unwrap_or("").to_string();

    add_mem0_memory(
        ctx,
        &memory_to_store,
        "agent_portfolio_manager",
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
                decision: plan.clone(),
                confidence,
                predicted_outcome: predicted_outcome.clone(),
                source_agent: "portfolio_manager".to_string(),
                realized_pnl: 0.0,
                timestamp: now,
            });
        }

        tx_ctx.db.reasoning_log().insert(ReasoningLog {
            log_id: 0,
            proposal_id: proposal_id.clone(),
            cycle_pass: pass_no,
            agent_id: "portfolio_manager".to_string(),
            reasoning: reasoning.clone(),
            decision: plan.clone(),
            confidence,
            has_conflict: false,
            timestamp: now,
        });

        if !message_to_cro.is_empty() {
            tx_ctx.db.agent_messages().insert(AgentMessage {
                msg_id: 0,
                from_agent: "portfolio_manager".to_string(),
                to_agent: "cro".to_string(),
                content: message_to_cro.clone(),
                is_read: false,
                sent_at: now,
            });
        }

        if let Some(mut p) = tx_ctx.db.trade_proposal().proposal_id().find(proposal_id.clone()) {
            p.cycle_pass = pass_no;
            p.pm_plan = plan.clone();
            p.side = side.clone();
            p.size = size;
            p.entry_price = entry;
            p.stop_loss = stop_loss;
            p.take_profit = take_profit;
            p.status = "reviewed".to_string();
            p.updated_at = now;
            tx_ctx.db.trade_proposal().proposal_id().delete(proposal_id.clone());
            tx_ctx.db.trade_proposal().insert(p);
        }

        if let Some(agent) = tx_ctx
            .db
            .agent()
            .agent_id()
            .find("portfolio_manager".to_string())
        {
            tx_ctx
                .db
                .agent()
                .agent_id()
                .delete("portfolio_manager".to_string());
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
