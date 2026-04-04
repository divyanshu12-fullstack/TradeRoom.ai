use spacetimedb::table;
use spacetimedb::Timestamp;

/// Live market price data, updated every 30 seconds.
/// Consumed by Quant, PM, and CRO agents.
#[table(accessor = market_live, public)]
pub struct MarketLive {
    #[primary_key]
    pub symbol: String,
    pub price: f64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub volume: i64,
    pub prev_close: f64,
    pub change_pct: f64,
    pub volatility: f32,
    pub market_state: String, // "PRE" | "REGULAR" | "POST" | "CLOSED"
    pub updated_at: Timestamp,
}

/// Market fundamentals and analyst consensus, updated every 4 hours.
/// Consumed by PM and CRO agents.
#[table(accessor = market_context, public)]
pub struct MarketContext {
    #[primary_key]
    pub symbol: String,
    pub market_cap: i64,
    pub pe_ratio: f64,
    pub analyst_target_mean: f64,
    pub analyst_target_low: f64,
    pub analyst_target_high: f64,
    pub recommendation: String, // "buy" | "hold" | "sell" | "strongBuy" | "strongSell"
    pub earnings_date: Option<String>,
    pub sector: String,
    pub industry: String,
    pub updated_at: Timestamp,
}

/// OHLCV bar history for technical analysis.
/// Consumed by Quant agent for pattern detection and backtesting.
#[table(accessor = ohlcv_history, public)]
pub struct OhlcvHistory {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub symbol: String,
    pub interval: String, // "5m" | "1h" | "1d"
    pub timestamp: Timestamp,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: i64,
}

/// Market news headlines and articles.
/// Consumed by Quant agent for sentiment and event-driven signals.
#[table(accessor = market_news, public)]
pub struct MarketNews {
    #[primary_key]
    pub uuid: String,
    pub symbol: String,
    pub title: String,
    pub publisher: String,
    pub link: String,
    pub published_at: Timestamp,
}

/// Analyst rating changes and signals.
/// Consumed by CRO agent to veto trades if analysts downgrade during proposal.
#[table(accessor = analyst_signals, public)]
pub struct AnalystSignals {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub symbol: String,
    pub firm: String,
    pub to_grade: String,
    pub from_grade: String,
    pub action: String, // "upgrade" | "downgrade" | "init" | "reiterate"
    pub date: String,
}
