# Backend (Cloud-first)

This backend is a SpacetimeDB Rust module split into focused files under `backend/src`.

## Current focus

- Build and publish to hosted SpacetimeDB (`maincloud`)
- No local runtime requirement right now
- Frontend can consume backend HTTP API at `http://localhost:8787`

## Required env vars

Set these in root `.env`:

- `GEMINI_API_KEY`
- `MEM0_API_KEY`
- `GEMINI_MODEL_NAME`
- `MEM0_SWARM_USER_ID` (optional, defaults to `traderoom_swarm`)
- `SPACETIME_SERVER` (required)
- `SPACETIME_DB_NAME` (required)
- `API_PORT` (optional, defaults to `8787` for HTTP API)

Template is in `.env.example`.

## Publish to hosted SpacetimeDB

From project root:

### Bash

```bash
bash backend/scripts/publish-cloud.sh
```

### PowerShell

```powershell
./backend/scripts/publish-cloud.ps1
```

Both scripts:

1. Load root `.env`
2. Build wasm from `backend/Cargo.toml`
3. Publish module using `spacetime publish --server $SPACETIME_SERVER`

## Validation

Use wasm target checks for module validation:

```bash
cargo check --manifest-path backend/Cargo.toml --target wasm32-unknown-unknown
```

`cargo test` on native host may fail to link because Spacetime runtime symbols are provided in module runtime, not native test runtime.

## Run backend API for frontend integration

This repo includes a lightweight Node HTTP service that exposes:

- `GET /health`
- `GET /api/state`
- `POST /api/run`

From `backend/`:

```bash
npm run api
```

The service reads `SPACETIME_SERVER` and `SPACETIME_DB_NAME` from root `.env`.
For testing, you can override env source with `API_ENV_FILE` (path relative to repo root).

## Notes

- Crate entrypoint stays at `backend/lib.rs` and wires modules from `backend/src/*`.
- If frontend bindings are added later, generate from the published wasm artifact and target db.
