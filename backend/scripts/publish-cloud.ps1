$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $root

if (!(Test-Path ".env")) {
  throw "Missing .env at project root"
}

Get-Content .env | ForEach-Object {
  if ($_ -match '^(\w+)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
  }
}

if ([string]::IsNullOrWhiteSpace($env:SPACETIME_DB_NAME)) {
  throw "SPACETIME_DB_NAME is required"
}

if ([string]::IsNullOrWhiteSpace($env:SPACETIME_SERVER)) {
  $env:SPACETIME_SERVER = "maincloud"
}

cargo build --manifest-path backend/Cargo.toml --release --target wasm32-unknown-unknown

$wasmPath = "backend/target/wasm32-unknown-unknown/release/traderoom.wasm"
if (!(Test-Path $wasmPath)) {
  throw "WASM build missing at $wasmPath"
}

spacetime publish --server $env:SPACETIME_SERVER -y --bin-path $wasmPath $env:SPACETIME_DB_NAME
Write-Host "Published $($env:SPACETIME_DB_NAME) to $($env:SPACETIME_SERVER)"
