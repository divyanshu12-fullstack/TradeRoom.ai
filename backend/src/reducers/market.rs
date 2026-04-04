use spacetimedb::{reducer, ReducerContext, Table};

use crate::common::time::now_secs;
use crate::schema::accessors::*;
use crate::schema::market::{MarketTicker, PortfolioPosition};
use crate::schema::risk::RiskLimit;

#[reducer]
pub fn upsert_market_ticker(
    ctx: &ReducerContext,
    symbol: String,
    price: f64,
    volume_24h: f64,
    volatility: f32,
    sentiment: f32,
) {
    let now = now_secs(ctx);
    ctx.db.market_ticker().symbol().delete(symbol.clone());
    ctx.db.market_ticker().insert(MarketTicker {
        symbol,
        price,
        volume_24h,
        volatility,
        sentiment,
        updated_at: now,
    });
}

#[reducer]
pub fn upsert_portfolio_position(
    ctx: &ReducerContext,
    symbol: String,
    quantity: f64,
    entry_price: f64,
    current_price: f64,
) {
    let now = now_secs(ctx);
    let unrealized_pnl = (current_price - entry_price) * quantity;

    ctx.db.portfolio_position().symbol().delete(symbol.clone());
    ctx.db.portfolio_position().insert(PortfolioPosition {
        symbol,
        quantity,
        entry_price,
        current_price,
        unrealized_pnl,
        updated_at: now,
    });
}

#[reducer]
pub fn set_risk_limit(ctx: &ReducerContext, key: String, value: f64) {
    let now = now_secs(ctx);
    ctx.db.risk_limit().key().delete(key.clone());
    ctx.db.risk_limit().insert(RiskLimit { key, value, updated_at: now });
}
