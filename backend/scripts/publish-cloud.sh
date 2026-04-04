#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env at project root"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${SPACETIME_DB_NAME:-}" ]]; then
  echo "SPACETIME_DB_NAME is required"
  exit 1
fi

SPACETIME_SERVER="${SPACETIME_SERVER:-maincloud}"

cargo build --manifest-path backend/Cargo.toml --release --target wasm32-unknown-unknown

WASM_PATH="backend/target/wasm32-unknown-unknown/release/traderoom.wasm"
if [[ ! -f "$WASM_PATH" ]]; then
  echo "WASM build missing at $WASM_PATH"
  exit 1
fi

spacetime publish --server "$SPACETIME_SERVER" -y --bin-path "$WASM_PATH" "$SPACETIME_DB_NAME"

echo "Published $SPACETIME_DB_NAME to $SPACETIME_SERVER"
