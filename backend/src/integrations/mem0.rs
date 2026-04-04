use serde_json::Value;
use spacetimedb::http::Request;
use spacetimedb::ProcedureContext;

use crate::common::constants::{mem0_api_key, MEM0_ADD_URL, MEM0_SEARCH_URL};

pub fn build_mem0_add_body(
    content: &str,
    user_id: &str,
    pattern: &str,
    confidence: f32,
    predicted_outcome: &str,
) -> Vec<u8> {
    serde_json::json!({
        "messages": [{ "role": "user", "content": content }],
        "user_id": user_id,
        "metadata": {
            "pattern": pattern,
            "confidence": confidence,
            "predicted_outcome": predicted_outcome
        }
    })
    .to_string()
    .into_bytes()
}

pub fn retrieve_mem0_insights(ctx: &mut ProcedureContext, query: &str, user_id: &str) -> String {
    let mem0_body = serde_json::json!({
        "query": query,
        "user_id": user_id,
        "limit": 10
    })
    .to_string()
    .into_bytes();

    let raw_resp = match ctx.http.send(
        Request::builder()
            .method("POST")
            .uri(MEM0_SEARCH_URL)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Token {}", mem0_api_key()))
            .body(mem0_body)
            .unwrap(),
    ) {
        Ok(resp) => resp.into_parts().1.into_string_lossy(),
        Err(e) => {
            log::error!("[mem0] search failed: {:?}", e);
            return "Mem0 unavailable. Continue with live state only.".to_string();
        }
    };

    let parsed: Value = match serde_json::from_str(&raw_resp) {
        Ok(v) => v,
        Err(_) => return "Mem0 response unreadable. Continue with live state only.".to_string(),
    };

    let mut ranked: Vec<(f64, String)> = Vec::new();
    if let Some(arr) = parsed.as_array() {
        for (idx, item) in arr.iter().enumerate() {
            let score = item["score"].as_f64().unwrap_or(0.0);
            let mem_text = item["memory"].as_str().unwrap_or("");

            let mut conf = 0.5;
            let mut pattern = "unknown".to_string();
            if let Some(meta) = item.get("metadata") {
                conf = meta.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.5);
                pattern = meta
                    .get("pattern")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
            }

            ranked.push((
                score + conf,
                format!("{}. [pattern: {}, conf: {:.2}] {}", idx + 1, pattern, conf, mem_text),
            ));
        }
    }

    ranked.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    let top: Vec<String> = ranked.into_iter().take(3).map(|(_, v)| v).collect();

    if top.is_empty() {
        "No useful memory matches found.".to_string()
    } else {
        format!("Relevant memory hints:\n{}", top.join("\n"))
    }
}

pub fn add_mem0_memory(
    ctx: &mut ProcedureContext,
    content: &str,
    user_id: &str,
    pattern: &str,
    confidence: f32,
    predicted_outcome: &str,
) {
    if content.trim().is_empty() {
        return;
    }

    let body = build_mem0_add_body(content, user_id, pattern, confidence, predicted_outcome);
    if let Err(e) = ctx.http.send(
        Request::builder()
            .method("POST")
            .uri(MEM0_ADD_URL)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Token {}", mem0_api_key()))
            .body(body)
            .unwrap(),
    ) {
        log::error!("[mem0] add failed: {:?}", e);
    }
}
