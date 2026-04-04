use spacetimedb::table;

#[derive(Clone)]
#[table(accessor = agent, public)]
pub struct Agent {
    #[primary_key]
    pub agent_id: String,
    pub agent_type: String,
    pub status: String,
    pub current_task: String,
    pub confidence: f32,
    pub last_updated: u64,
}
