import { useEffect, useMemo, useState } from "react";

const AGENTS = [
    { id: "quant", backendId: "quant", label: "Quant", blurb: "Signal interpretation" },
    { id: "pm", backendId: "portfolio_manager", label: "Portfolio Manager", blurb: "Sizing and plan" },
    { id: "cro", backendId: "cro", label: "Chief Risk Officer", blurb: "Veto and controls" }
];

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:8787").replace(/\/+$/, "");

function apiUrl(endpoint) {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${API_BASE}${path}`;
}

const initialAgentState = AGENTS.reduce((acc, agent) => {
    acc[agent.id] = {
        status: "idle",
        confidence: 0,
        note: "Waiting"
    };
    return acc;
}, {});

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toKeyMap(rows, keyField = "key", valueField = "value") {
    const out = {};
    for (const row of rows || []) {
        out[row[keyField]] = row[valueField];
    }
    return out;
}

function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function levelFromDecision(text) {
    const upper = String(text || "").toUpperCase();
    if (upper.includes("VETO") || upper.includes("BLOCK") || upper.includes("ERROR")) return "warn";
    if (upper.includes("APPROVE") || upper.includes("EXECUTED")) return "ok";
    return "info";
}

function fmtTime(ts) {
    if (!ts) return "-";
    const ms = ts > 9999999999 ? ts : ts * 1000;
    return new Date(ms).toLocaleTimeString();
}

export default function App() {
    const [task, setTask] = useState("Evaluate a simple trade plan for RELIANCE over the next 1-2 weeks, focusing on downside protection.");
    const [symbol, setSymbol] = useState("RELIANCE");
    const [riskMode, setRiskMode] = useState("balanced");
    const [marketNote, setMarketNote] = useState("Indian market context: war-driven crude oil volatility, possible INR pressure, and cautious FII flows.");

    const [agents, setAgents] = useState(initialAgentState);
    const [timeline, setTimeline] = useState([]);
    const [decision, setDecision] = useState(null);
    const [running, setRunning] = useState(false);
    const [pass, setPass] = useState(0);
    const [connected, setConnected] = useState(false);
    const [connectionInfo, setConnectionInfo] = useState({ server: "-", database: "-" });
    const [lastSync, setLastSync] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    const backendPreview = useMemo(() => {
        return [
            `POST ${apiUrl("/api/run")}`,
            `GET ${apiUrl("/api/state")}`
        ];
    }, []);

    const syncState = async () => {
        const res = await fetch(apiUrl("/api/state"));
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.detail || "state fetch failed");
        }

        const payload = await res.json();
        setConnected(true);
        setErrorMsg("");
        setConnectionInfo({
            server: payload.server || "-",
            database: payload.database || "-"
        });
        setLastSync(payload.fetchedAt || Date.now());

        const shared = toKeyMap(payload.shared || []);
        setPass(num(shared.cycle_pass, 0));

        const byBackendId = {};
        for (const row of payload.agents || []) {
            byBackendId[row.agent_id] = row;
        }

        const nextAgents = { ...initialAgentState };
        for (const card of AGENTS) {
            const src = byBackendId[card.backendId];
            if (!src) continue;
            nextAgents[card.id] = {
                status: src.status || "idle",
                confidence: num(src.confidence, 0),
                note: src.current_task || "Waiting"
            };
        }
        setAgents(nextAgents);

        const sortedLogs = [...(payload.logs || [])]
            .sort((a, b) => num(b.timestamp, 0) - num(a.timestamp, 0))
            .slice(0, 24)
            .map((row, idx) => ({
                id: `${row.timestamp || Date.now()}-${idx}`,
                actor: row.agent_id || "system",
                msg: row.decision || "No decision text",
                level: levelFromDecision(row.decision),
                time: fmtTime(row.timestamp)
            }));

        const systemTail = [];
        if (shared.trade_decision) {
            systemTail.push({
                id: `final-${shared.trade_decision}`,
                actor: "system",
                msg: `Final decision: ${shared.trade_decision}`,
                level: levelFromDecision(shared.trade_decision),
                time: fmtTime(Date.now())
            });
        }
        setTimeline([...systemTail, ...sortedLogs]);

        const proposal = [...(payload.proposals || [])].sort((a, b) => num(b.updated_at, 0) - num(a.updated_at, 0))[0];
        if (!proposal) {
            setDecision(null);
            return;
        }

        setDecision({
            symbol: proposal.symbol,
            side: proposal.side,
            sizePct: (num(proposal.size, 0) * 100).toFixed(0),
            stop: proposal.stop_loss || "-",
            take: proposal.take_profit || "-",
            approved: Boolean(proposal.cro_approved),
            reason: proposal.cro_reason || proposal.cro_verdict || proposal.status,
            status: proposal.status
        });
    };

    const runDemo = async () => {
        if (running) return;

        setRunning(true);

        try {
            const res = await fetch(apiUrl("/api/run"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol,
                    marketNote: `${marketNote} | risk mode: ${riskMode}`,
                    task
                })
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.detail || "run failed");
            }

            await wait(500);
            await syncState();
        } catch (e) {
            setConnected(false);
            setErrorMsg(e.message || String(e));
        } finally {
            setRunning(false);
        }
    };

    const resetDemo = () => {
        setRunning(false);
        syncState().catch((e) => {
            setConnected(false);
            setErrorMsg(e.message || String(e));
        });
    };

    useEffect(() => {
        let disposed = false;

        const pull = async () => {
            try {
                await syncState();
            } catch (e) {
                if (disposed) return;
                setConnected(false);
                setErrorMsg(e.message || String(e));
            }
        };

        pull();
        const id = setInterval(pull, 2500);
        return () => {
            disposed = true;
            clearInterval(id);
        };
    }, []);

    return (
        <div className="page-shell">
            <div className="bg-grid" />
            <header className="top-bar">
                <div>
                    <p className="eyebrow">TradeRoom.ai Hackathon</p>
                    <h1>Autonomous Trading Floor Demo</h1>
                </div>
                <div className={`status-pill ${connected ? "connected" : "error"}`}>
                    {connected ? `Live ${connectionInfo.server}/${connectionInfo.database}` : "Disconnected"}
                </div>
            </header>

            <main className="layout">
                <section className="panel composer">
                    <h2>Task Deck</h2>
                    <label>
                        Mission for agents
                        <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={5} />
                    </label>

                    <div className="row two-col">
                        <label>
                            Symbol
                            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
                        </label>
                        <label>
                            Risk mode
                            <select value={riskMode} onChange={(e) => setRiskMode(e.target.value)}>
                                <option value="conservative">Conservative</option>
                                <option value="balanced">Balanced</option>
                                <option value="aggressive">Aggressive</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        Market note
                        <input value={marketNote} onChange={(e) => setMarketNote(e.target.value)} />
                    </label>

                    <div className="btn-row">
                        <button onClick={runDemo} disabled={running} className="btn btn-primary">
                            {running ? "Dispatching Task..." : "Run Swarm Demo"}
                        </button>
                        <button onClick={resetDemo} className="btn btn-ghost">
                            Reset
                        </button>
                    </div>

                    <p className="muted small-gap">
                        Pass: {pass || 0}/3 | Last sync: {lastSync ? fmtTime(lastSync) : "-"}
                    </p>
                    {!connected && errorMsg && <p className="error-line">{errorMsg}</p>}

                    <div className="callout">
                        <h3>Live Backend API</h3>
                        {backendPreview.map((line) => (
                            <pre key={line}>{line}</pre>
                        ))}
                    </div>
                </section>

                <section className="panel agents">
                    <h2>Agent Floor</h2>
                    <div className="agent-grid">
                        {AGENTS.map((agent) => {
                            const state = agents[agent.id];
                            return (
                                <article key={agent.id} className={`agent-card ${state.status}`}>
                                    <p className="agent-name">{agent.label}</p>
                                    <p className="agent-blurb">{agent.blurb}</p>
                                    <p className="agent-note">{state.note}</p>
                                    <div className="meter">
                                        <span style={{ width: `${Math.round(state.confidence * 100)}%` }} />
                                    </div>
                                    <p className="agent-confidence">Confidence {(state.confidence * 100).toFixed(0)}%</p>
                                </article>
                            );
                        })}
                    </div>

                    <div className="decision-block">
                        <h3>Decision Gate</h3>
                        {!decision && <p className="muted">Run the swarm to generate a recommendation.</p>}
                        {decision && (
                            <div className={`decision-card ${decision.approved ? "approved" : "veto"}`}>
                                <p className="decision-main">
                                    {decision.approved ? "Approved" : "Vetoed"}: {decision.side} {decision.symbol}
                                </p>
                                <p>
                                    Size {decision.sizePct}% | Stop {decision.stop} | Take {decision.take}
                                </p>
                                <p>Status: {decision.status}</p>
                                <p>{decision.reason}</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="panel timeline">
                    <h2>Reasoning Stream</h2>
                    <div className="timeline-feed">
                        {timeline.length === 0 && <p className="muted">No events yet.</p>}
                        {timeline.map((item) => (
                            <article key={item.id} className={`event ${item.level}`}>
                                <div className="event-head">
                                    <strong>{item.actor.toUpperCase()}</strong>
                                    <span>{item.time}</span>
                                </div>
                                <p>{item.msg}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
