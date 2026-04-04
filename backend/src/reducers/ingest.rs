use spacetimedb::{reducer, ReducerContext, Timestamp};

// Note: After `spacetime publish`, these reducers will have access to the
// auto-generated table accessor functions (market_live, market_context, etc.)
// For now, these are placeholder definitions that will be fully implemented
// once the module is published and the bindings are generated.

/// Ingest live market tick data (price, OHLCV, market state, volatility).
/// Called every 30 seconds by the data poller.
#[reducer]
pub fn ingest_market_tick(
    _ctx: &ReducerContext,
    _symbol: String,
    _price: f64,
    _open: f64,
    _high: f64,
    _low: f64,
    _volume: i64,
    _prev_close: f64,
    _change_pct: f64,
    _volatility: f32,
    _market_state: String,
) {
    // TODO: Implement after spacetime publish
    // ctx.db.market_live().symbol().delete(symbol.clone());
    // ctx.db.market_live().insert(MarketLive { ... });
}

/// Ingest market fundamentals and analyst consensus.
/// Called every 4 hours by the data poller for context refresh.
#[reducer]
pub fn ingest_market_context(
    _ctx: &ReducerContext,
    _symbol: String,
    _market_cap: i64,
    _pe_ratio: f64,
    _analyst_target_mean: f64,
    _analyst_target_low: f64,
    _analyst_target_high: f64,
    _recommendation: String,
    _earnings_date: Option<String>,
    _sector: String,
    _industry: String,
) {
    // TODO: Implement after spacetime publish
}

/// Ingest OHLCV bar history for technical analysis.
/// Called at startup and daily refresh by the data poller.
#[reducer]
pub fn ingest_ohlcv(
    _ctx: &ReducerContext,
    _symbol: String,
    _interval: String,
    _timestamp: Timestamp,
    _open: f64,
    _high: f64,
    _low: f64,
    _close: f64,
    _volume: i64,
) {
    // TODO: Implement after spacetime publish
}

/// Ingest market news articles.
/// Called every 4 hours by the data poller. Deduplicates by uuid.
#[reducer]
pub fn ingest_news(
    _ctx: &ReducerContext,
    _uuid: String,
    _symbol: String,
    _title: String,
    _publisher: String,
    _link: String,
    _published_at: Timestamp,
) {
    // TODO: Implement after spacetime publish
}

/// Ingest analyst rating changes and signals.
/// Called every 4 hours by the data poller.
#[reducer]
pub fn ingest_analyst_signal(
    _ctx: &ReducerContext,
    _symbol: String,
    _firm: String,
    _to_grade: String,
    _from_grade: String,
    _action: String,
    _date: String,
) {
    // TODO: Implement after spacetime publish
}
