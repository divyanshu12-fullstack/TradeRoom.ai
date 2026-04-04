use serde_json::Value;
use spacetimedb::{http::Request, ProcedureContext, ScheduleAt, Table};

use crate::common::constants::{gemini_api_key, gemini_model_name, GEMINI_URL};
use crate::common::time::{now_micros_proc, now_secs_proc};
use crate::integrations::gemini::{build_gemini_request, extract_gemini_text};
use crate::schema::accessors::*;
use crate::schema::agent::Agent;
use crate::schema::context::SharedContext;
use crate::schema::schedule::{CroSchedule, PatternSchedule, PmSchedule, QuantSchedule};

#[spacetimedb::procedure]
pub fn pattern_extractor_think(ctx: &mut ProcedureContext, _arg: PatternSchedule) {
    let (symbol, note, ticker_text) = ctx.with_tx(|tx_ctx| {
        let symbol = tx_ctx
            .db
            .shared_context()
            .key()
            .find("market_symbol".to_string())
            .map(|v| v.value)
            .unwrap_or_else(|| "BTCUSDT".to_string());

        let note = tx_ctx
            .db
            .shared_context()
            .key()
            .find("market_note".to_string())
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

        (symbol, note, ticker_text)
    });

    let prompt = format!(
        "SYMBOL: {}\nNOTE: {}\nTICK: {}\n\nClassify market pattern.",
        symbol, note, ticker_text
    );

    let system_instruction = "You are a market pattern extractor. Respond with JSON keys: pattern, regime, volatility_band, signal_quality.";
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
            log::error!("[pattern] Gemini failed: {:?}", e);
            "{\"pattern\":\"unknown\",\"regime\":\"mixed\",\"volatility_band\":\"high\",\"signal_quality\":\"low\"}".to_string()
        }
    };

    let parsed_text = extract_gemini_text(&raw).unwrap_or(raw);
    let parsed: Value = serde_json::from_str(&parsed_text).unwrap_or_else(|_| {
        serde_json::json!({
            "pattern": "unknown",
            "regime": "mixed",
            "volatility_band": "high",
            "signal_quality": "low"
        })
    });

    let pattern = parsed["pattern"].as_str().unwrap_or("unknown");
    let regime = parsed["regime"].as_str().unwrap_or("mixed");
    let signal_quality = parsed["signal_quality"].as_str().unwrap_or("low");

    let now = now_secs_proc(ctx);
    let now_micros = now_micros_proc(ctx);

    ctx.with_tx(|tx_ctx| {
        for (k, v) in [
            ("market_pattern", pattern),
            ("market_regime", regime),
            ("signal_quality", signal_quality),
        ] {
            tx_ctx.db.shared_context().key().delete(k.to_string());
            tx_ctx.db.shared_context().insert(SharedContext {
                key: k.to_string(),
                value: v.to_string(),
                updated_at: now,
            });
        }

        for id in ["quant", "portfolio_manager", "cro"] {
            if let Some(agent) = tx_ctx.db.agent().agent_id().find(id.to_string()) {
                tx_ctx.db.agent().agent_id().delete(id.to_string());
                tx_ctx.db.agent().insert(Agent {
                    status: "thinking".to_string(),
                    current_task: format!("{} / {}", pattern, regime),
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

    log::info!("[pattern] {} {} {}", symbol, pattern, regime);
}
