use spacetimedb::table;

#[table(accessor = structured_memory, public)]
pub struct StructuredMemory {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub proposal_id: String,
    pub pattern: String,
    pub insight: String,
    pub decision: String,
    pub confidence: f32,
    pub predicted_outcome: String,
    pub source_agent: String,
    pub realized_pnl: f64,
    pub timestamp: u64,
}
