pub fn gemini_api_key() -> &'static str {
    option_env!("GEMINI_API_KEY").unwrap_or("")
}

pub fn mem0_api_key() -> &'static str {
    option_env!("MEM0_API_KEY").unwrap_or("")
}

pub fn gemini_model_name() -> &'static str {
    option_env!("GEMINI_MODEL_NAME").unwrap_or("")
}

pub const GEMINI_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/";
pub const MEM0_SEARCH_URL: &str = "https://api.mem0.ai/v1/memories/search/";
pub const MEM0_ADD_URL: &str = "https://api.mem0.ai/v1/memories/";

pub fn mem0_swarm_user_id() -> &'static str {
    option_env!("MEM0_SWARM_USER_ID").unwrap_or("traderoom_swarm")
}
