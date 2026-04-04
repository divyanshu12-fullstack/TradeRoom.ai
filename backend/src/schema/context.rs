use spacetimedb::table;

#[table(accessor = shared_context, public)]
pub struct SharedContext {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}
