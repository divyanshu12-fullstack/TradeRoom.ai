use spacetimedb::table;

#[table(accessor = risk_limit, public)]
pub struct RiskLimit {
    #[primary_key]
    pub key: String,
    pub value: f64,
    pub updated_at: u64,
}
