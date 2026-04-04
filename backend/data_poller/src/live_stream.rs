use std::time::Duration;
use tracing::info;

use crate::market_hours;
use crate::spacetime_client::DbConnection;

/// Stream live market ticks every 30 seconds via WebSocket.
/// Converts tick data to ingest_market_tick reducer calls.
/// Only writes to database during market hours.
pub async fn run(symbols: &[&str], _stdb: &DbConnection) {
    info!("Live stream: starting for {} symbols", symbols.len());

    let interval = Duration::from_secs(30);
    let mut interval_timer = tokio::time::interval(interval);

    loop {
        interval_timer.tick().await;

        // Skip if market is closed
        if !market_hours::is_market_open_extended() {
            continue;
        }

        for symbol in symbols {
            if !market_hours::is_market_open_extended() {
                continue;
            }

            // In a real implementation, you would fetch data from yfinance-rs here.
            // For now, this is a placeholder showing the structure.
            //
            // Example with yfinance-rs:
            // let client = YfClient::default();
            // if let Ok(ticker) = Ticker::new(&client, symbol).get_quote_type().await {
            //     let data = ticker.quote_data().unwrap_or_default();
            //     let call = stdb.call_ingest_market_tick(
            //         symbol.to_string(),
            //         data.regular_market_price,
            //         data.open,
            //         data.fifty_two_week_high,
            //         data.fifty_two_week_low,
            //         data.regular_market_volume,
            //         data.previous_close,
            //         (data.regular_market_price - data.previous_close) / data.previous_close,
            //         0.15,  // volatility estimate
            //         "REGULAR".to_string(),
            //     ).await;
            // }

            info!("Live tick for {}", symbol);
        }
    }
}
