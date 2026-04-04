use spacetimedb::table;

#[table(accessor = reasoning_log, public)]
pub struct ReasoningLog {
    #[primary_key]
    #[auto_inc]
    pub log_id: u64,
    pub proposal_id: String,
    pub cycle_pass: u32,
    pub agent_id: String,
    pub reasoning: String,
    pub decision: String,
    pub confidence: f32,
    pub has_conflict: bool,
    pub timestamp: u64,
}

#[table(accessor = decision_log, public)]
pub struct DecisionLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub proposal_id: String,
    pub verdict: String,
    pub summary: String,
    pub confidence: f32,
    pub timestamp: u64,
}
