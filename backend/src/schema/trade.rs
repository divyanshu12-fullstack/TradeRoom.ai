use spacetimedb::table;

#[derive(Clone)]
#[table(accessor = trade_proposal, public)]
pub struct TradeProposal {
    #[primary_key]
    pub proposal_id: String,
    pub symbol: String,
    pub cycle_pass: u32,
    pub quant_thesis: String,
    pub pm_plan: String,
    pub side: String,
    pub size: f64,
    pub entry_price: f64,
    pub stop_loss: f64,
    pub take_profit: f64,
    pub cro_verdict: String,
    pub cro_reason: String,
    pub cro_approved: bool,
    pub status: String,
    pub override_by: String,
    pub override_reason: String,
    pub override_at: u64,
    pub executed_at: u64,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = trade_result, public)]
pub struct TradeResult {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub proposal_id: String,
    pub symbol: String,
    pub exit_price: f64,
    pub realized_pnl: f64,
    pub hold_secs: u64,
    pub closed_at: u64,
}
