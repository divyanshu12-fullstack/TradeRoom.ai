use spacetimedb::{http::Request, ProcedureContext, Table};

use crate::common::constants::{mem0_api_key, mem0_swarm_user_id, MEM0_SEARCH_URL};
use crate::common::time::now_secs_proc;
use crate::schema::accessors::*;
use crate::schema::context::SharedContext;

#[spacetimedb::procedure]
pub fn get_mem0_memories(ctx: &mut ProcedureContext) -> Result<(), String> {
    let body = serde_json::json!({
        "query": "trade pattern risk veto execution",
        "limit": 50,
        "user_id": mem0_swarm_user_id()
    })
    .to_string()
    .into_bytes();

    match ctx.http.send(
        Request::builder()
            .method("POST")
            .uri(MEM0_SEARCH_URL)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Token {}", mem0_api_key()))
            .body(body)
            .unwrap(),
    ) {
        Ok(resp) => {
            let txt = resp.into_parts().1.into_string_lossy();
            let now = now_secs_proc(ctx);
            ctx.with_tx(|tx_ctx| {
                tx_ctx.db.shared_context().key().delete("mem0_memories".to_string());
                tx_ctx.db.shared_context().insert(SharedContext {
                    key: "mem0_memories".to_string(),
                    value: txt.to_string(),
                    updated_at: now,
                });
            });
            Ok(())
        }
        Err(e) => Err(format!("mem0 fetch failed: {:?}", e)),
    }
}
