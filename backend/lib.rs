// TradeRoom SpaceTimeDB module entry point
// Declares all submodules that comprise the AI agent swarm

#[path = "src/common/mod.rs"]
mod common;
#[path = "src/integrations/mod.rs"]
mod integrations;
#[path = "src/schema/mod.rs"]
mod schema;
#[path = "src/reducers/mod.rs"]
mod reducers;
#[path = "src/procedures/mod.rs"]
mod procedures;
#[path = "src/tests/mod.rs"]
mod tests;

// Explicit re-exports to avoid ambiguous glob re-export conflicts
pub use schema::accessors;
pub use schema::agent;
pub use schema::context;
pub use schema::logs;
pub use schema::market;
pub use schema::market_data;
pub use schema::memory;
pub use schema::messages as schema_messages;
pub use schema::risk;
pub use schema::schedule;
pub use schema::trade;

pub use reducers::execution;
pub use reducers::ingest;
pub use reducers::init;
pub use reducers::launch;
pub use reducers::messages as reducer_messages;
pub use reducers::outcome;

pub use procedures::cro;
pub use procedures::cycle;
pub use procedures::memory_web;
pub use procedures::pattern;
pub use procedures::pm;
pub use procedures::quant;

pub use integrations::gemini;
pub use integrations::mem0;

pub use common::constants;
pub use common::time;
