mod live_stream;
mod context_refresh;
mod market_hours;
mod spacetime_client;

use std::env;
use tracing::{error, info};

#[tokio::main]
async fn main() {
    // Load .env file
    dotenv::dotenv().ok();

    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            env::var("RUST_LOG")
                .unwrap_or_else(|_| "traderoom_data_poller=info".to_string())
                .as_str(),
        )
        .init();

    info!("TradeRoom Data Poller starting...");

    // Load configuration from .env
    let watchlist = env::var("WATCHLIST")
        .unwrap_or_else(|_| "AAPL,TSLA,NVDA,SPY,QQQ".to_string());
    let symbols: Vec<&str> = watchlist.split(',').collect();
    let symbols_strings: Vec<String> = watchlist.split(',').map(|s| s.to_string()).collect();
    let symbols_refs: Vec<&str> = symbols_strings.iter().map(|s| s.as_str()).collect();

    let spacetime_server = env::var("SPACETIME_SERVER")
        .unwrap_or_else(|_| "localhost:3000".to_string());
    let spacetime_db = env::var("SPACETIME_DB_NAME")
        .unwrap_or_else(|_| "traderoom".to_string());

    info!("Config: watchlist={:?}, server={}, db={}", symbols, spacetime_server, spacetime_db);

    // Connect to SpaceTimeDB
    let stdb = match spacetime_client::DbConnection::connect(&spacetime_server, &spacetime_db).await {
        Ok(conn) => {
            info!("Connected to SpaceTimeDB");
            conn
        }
        Err(e) => {
            error!("Failed to connect to SpaceTimeDB: {:?}", e);
            return;
        }
    };

    // Run live stream and context refresh in parallel
    info!("Starting live stream and context refresh tasks...");
    tokio::join!(
        live_stream::run(&symbols_refs, &stdb),
        context_refresh::run(&symbols_refs, &stdb),
    );
}
