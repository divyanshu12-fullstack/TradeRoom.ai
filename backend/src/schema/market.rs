use spacetimedb::table;

#[table(accessor = market_ticker, public)]
pub struct MarketTicker {
    #[primary_key]
    pub symbol: String,
    pub price: f64,
    pub volume_24h: f64,
    pub volatility: f32,
    pub sentiment: f32,
    pub updated_at: u64,
}

#[table(accessor = portfolio_position, public)]
pub struct PortfolioPosition {
    #[primary_key]
    pub symbol: String,
    pub quantity: f64,
    pub entry_price: f64,
    pub current_price: f64,
    pub unrealized_pnl: f64,
    pub updated_at: u64,
}
