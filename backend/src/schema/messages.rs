use spacetimedb::table;

#[derive(Clone)]
#[table(accessor = agent_messages, public)]
pub struct AgentMessage {
    #[primary_key]
    #[auto_inc]
    pub msg_id: u64,
    pub from_agent: String,
    pub to_agent: String,
    pub content: String,
    pub is_read: bool,
    pub sent_at: u64,
}
