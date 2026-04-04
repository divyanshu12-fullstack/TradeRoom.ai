use spacetimedb::{reducer, ReducerContext, Table};

use crate::common::time::now_secs;
use crate::schema::accessors::*;
use crate::schema::messages::AgentMessage;

#[reducer]
pub fn inject_signal(ctx: &ReducerContext, agent_id: String, msg: String) {
    ctx.db.agent_messages().insert(AgentMessage {
        msg_id: 0,
        from_agent: "human".to_string(),
        to_agent: agent_id,
        content: msg,
        is_read: false,
        sent_at: now_secs(ctx),
    });
}

#[reducer]
pub fn mark_read(ctx: &ReducerContext, msg_id: u64) {
    if let Some(msg) = ctx.db.agent_messages().msg_id().find(msg_id) {
        ctx.db.agent_messages().msg_id().delete(msg_id);
        ctx.db.agent_messages().insert(AgentMessage { is_read: true, ..msg });
    }
}
