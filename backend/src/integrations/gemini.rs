use serde_json::Value;

pub fn build_gemini_request(prompt: &str, system_instruction: &str) -> Vec<u8> {
    let body = serde_json::json!({
        "contents": [{
            "role": "user",
            "parts": [{ "text": prompt }]
        }],
        "systemInstruction": {
            "parts": [{ "text": system_instruction }]
        },
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    });

    body.to_string().into_bytes()
}

pub fn extract_gemini_text(raw: &str) -> Option<String> {
    let v: Value = serde_json::from_str(raw).ok()?;

    if let Some(err_obj) = v.get("error") {
        if let Some(msg) = err_obj.get("message") {
            let fallback_json = serde_json::json!({
                "reasoning": format!("SYSTEM ERROR: {}", msg.as_str().unwrap_or("Gemini API error")),
                "decision": "API_ERROR",
                "confidence": 0.0
            });
            return Some(fallback_json.to_string());
        }
    }

    let text_val = v
        .get("candidates")?
        .get(0)?
        .get("content")?
        .get("parts")?
        .get(0)?
        .get("text")?
        .as_str()?;

    let mut cleaned = text_val.trim();
    if cleaned.starts_with("```json") {
        cleaned = cleaned[7..].trim_start();
    } else if cleaned.starts_with("```") {
        cleaned = cleaned[3..].trim_start();
    }

    if cleaned.ends_with("```") {
        cleaned = cleaned[..cleaned.len() - 3].trim_end();
    }

    Some(cleaned.to_string())
}
