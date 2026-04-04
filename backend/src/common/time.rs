use spacetimedb::{ProcedureContext, ReducerContext};

pub fn now_secs(ctx: &ReducerContext) -> u64 {
    (ctx.timestamp.to_micros_since_unix_epoch() as u64) / 1_000_000
}

pub fn now_secs_proc(ctx: &ProcedureContext) -> u64 {
    (ctx.timestamp.to_micros_since_unix_epoch() as u64) / 1_000_000
}

pub fn now_micros_proc(ctx: &ProcedureContext) -> i64 {
    ctx.timestamp.to_micros_since_unix_epoch() as i64
}
