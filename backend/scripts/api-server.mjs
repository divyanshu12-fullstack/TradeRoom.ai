import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const envFilePath = process.env.API_ENV_FILE
    ? path.resolve(repoRoot, process.env.API_ENV_FILE)
    : path.join(repoRoot, ".env");

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    const out = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const idx = trimmed.indexOf("=");
        if (idx < 0) continue;

        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        out[key] = value;
    }

    return out;
}

function parseCell(raw) {
    const t = String(raw || "").trim();
    if (!t.length) return "";

    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
    if (t === "true") return true;
    if (t === "false") return false;

    const n = Number(t);
    if (!Number.isNaN(n)) return n;
    return t;
}

function parseSqlTableOutput(stdout) {
    const lines = String(stdout || "")
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line && !line.startsWith("WARNING:"));

    const headerIndex = lines.findIndex((line) => line.includes("|"));
    if (headerIndex < 0 || headerIndex + 1 >= lines.length) return [];

    const headerLine = lines[headerIndex];
    const separatorLine = lines[headerIndex + 1];
    if (!separatorLine.includes("-") && !separatorLine.includes("+")) return [];

    const headers = headerLine.split("|").map((part) => part.trim());
    const rows = [];

    for (let i = headerIndex + 2; i < lines.length; i += 1) {
        const rowLine = lines[i];
        if (!rowLine.includes("|")) continue;

        const cells = rowLine.split("|").map((part) => parseCell(part));
        if (cells.length !== headers.length) continue;

        const row = {};
        headers.forEach((header, idx) => {
            row[header] = cells[idx];
        });

        rows.push(row);
    }

    return rows;
}

function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1024 * 1024) {
                reject(new Error("request body too large"));
                req.destroy();
            }
        });

        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });

        req.on("error", reject);
    });
}

const rootEnv = parseEnvFile(envFilePath);

function readRequiredEnv(name) {
    const fromProcess = String(process.env[name] || "").trim();
    if (fromProcess) return fromProcess;

    const fromFile = String(rootEnv[name] || "").trim();
    if (fromFile) return fromFile;

    throw new Error(`[api] missing required env var ${name}. Set it in root .env or shell env.`);
}

const SPACETIME_SERVER = readRequiredEnv("SPACETIME_SERVER");
const SPACETIME_DB_NAME = readRequiredEnv("SPACETIME_DB_NAME");
const SPACETIME_BIN = process.env.SPACETIME_BIN || "spacetime";

// Mem0 config (optional — falls back gracefully if not set)
function readOptionalEnv(name) {
    const fromProcess = String(process.env[name] || "").trim();
    if (fromProcess) return fromProcess;
    return String(rootEnv[name] || "").trim();
}

const MEM0_API_KEY = readOptionalEnv("MEM0_API_KEY");
const MEM0_SWARM_USER_ID = readOptionalEnv("MEM0_SWARM_USER_ID") || "traderoom_swarm";
const MEM0_SEARCH_URL = "https://api.mem0.ai/v1/memories/";

const API_HOST = process.env.API_HOST || "0.0.0.0";
const API_PORT = Number(process.env.API_PORT || "8787");

async function runSpacetime(args) {
    const { stdout } = await execFileAsync(SPACETIME_BIN, args, {
        cwd: repoRoot,
        maxBuffer: 6 * 1024 * 1024
    });
    return stdout;
}

async function runSql(query) {
    const stdout = await runSpacetime(["sql", "--server", SPACETIME_SERVER, SPACETIME_DB_NAME, query]);
    return parseSqlTableOutput(stdout);
}

async function runCall(fnName, ...fnArgs) {
    await runSpacetime(["call", "--server", SPACETIME_SERVER, SPACETIME_DB_NAME, fnName, ...fnArgs]);
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
        return sendJson(res, 204, {});
    }

    if (req.method === "GET" && url.pathname === "/health") {
        return sendJson(res, 200, {
            ok: true,
            server: SPACETIME_SERVER,
            database: SPACETIME_DB_NAME,
            now: Date.now()
        });
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
        try {
            // Core tables — required
            const [agents, shared, proposals, logs, decisions] = await Promise.all([
                runSql("select agent_id,status,current_task,confidence,last_updated from agent;"),
                runSql("select key,value,updated_at from shared_context;"),
                runSql("select proposal_id,symbol,status,cro_verdict,cro_reason,cro_approved,side,size,entry_price,stop_loss,take_profit,cycle_pass,updated_at from trade_proposal;"),
                runSql("select agent_id,decision,confidence,cycle_pass,timestamp from reasoning_log;"),
                runSql("select verdict,summary,confidence,timestamp from decision_log;")
            ]);

            // structured_memory is optional — may not exist until first cycle
            let memory = [];
            try {
                memory = await runSql("select id,proposal_id,pattern,insight,decision,confidence,predicted_outcome,source_agent,realized_pnl,timestamp from structured_memory;");
            } catch (_) {
                // table may be empty or not yet populated
            }

            return sendJson(res, 200, {
                server: SPACETIME_SERVER,
                database: SPACETIME_DB_NAME,
                agents,
                shared,
                proposals,
                logs,
                decisions,
                memory,
                fetchedAt: Date.now()
            });
        } catch (err) {
            console.error("[api] state fetch failed:", err);
            return sendJson(res, 500, {
                error: "state_fetch_failed",
                detail: err?.message || String(err)
            });
        }
    }

    if (req.method === "POST" && url.pathname === "/api/run") {
        try {
            const body = await readJsonBody(req);
            const symbol = String(body.symbol || "BTCUSDT").toUpperCase();
            const marketNoteRaw = body.marketNote ?? body.market_note;
            const marketNote = String(marketNoteRaw || "frontend task").trim() || "frontend task";
            const task = String(body.task || "").trim();

            await runCall("launch_trade_cycle", symbol, marketNote);
            if (task.length) {
                await runCall("inject_signal", "quant", task);
            }

            return sendJson(res, 200, { ok: true, symbol });
        } catch (err) {
            console.error("[api] run failed:", err);
            return sendJson(res, 500, {
                error: "run_failed",
                detail: err?.message || String(err)
            });
        }
    }

    // --- Mem0 long-term memory endpoint ---
    if (req.method === "GET" && url.pathname === "/api/memories") {
        if (!MEM0_API_KEY) {
            return sendJson(res, 200, { memories: [], note: "MEM0_API_KEY not configured" });
        }

        try {
            const https = await import("https");
            const memUrl = new URL(MEM0_SEARCH_URL);
            memUrl.searchParams.set("user_id", MEM0_SWARM_USER_ID);
            memUrl.searchParams.set("limit", "100");

            const data = await new Promise((resolve, reject) => {
                const options = {
                    hostname: memUrl.hostname,
                    path: memUrl.pathname + memUrl.search,
                    method: "GET",
                    headers: {
                        "Authorization": `Token ${MEM0_API_KEY}`,
                        "Content-Type": "application/json"
                    }
                };

                const httpReq = https.default.request(options, (httpRes) => {
                    let body = "";
                    httpRes.on("data", chunk => body += chunk);
                    httpRes.on("end", () => {
                        try { resolve(JSON.parse(body)); }
                        catch (e) { reject(new Error("invalid json from mem0: " + body.slice(0, 200))); }
                    });
                });
                httpReq.on("error", reject);
                httpReq.end();
            });

            // Mem0 returns either an array or { results: [] }
            const memories = Array.isArray(data) ? data : (data.results || data.memories || []);
            return sendJson(res, 200, { memories, total: memories.length, fetchedAt: Date.now() });
        } catch (err) {
            return sendJson(res, 500, {
                error: "mem0_fetch_failed",
                detail: err?.message || String(err)
            });
        }
    }

    return sendJson(res, 404, { error: "not_found" });
});

server.listen(API_PORT, API_HOST, () => {
    console.log(
        `[api] listening on http://${API_HOST}:${API_PORT} (spacetime: ${SPACETIME_SERVER}/${SPACETIME_DB_NAME}, env: ${envFilePath})`
    );
});
