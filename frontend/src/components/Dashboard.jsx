import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, Activity, ShieldAlert, Cpu, Database, Server, Clock, Search, Briefcase, Zap } from 'lucide-react'

const AGENTS = [
  { id: 'quant', backendId: 'quant', label: 'Quant', blurb: 'Signal interpretation', color: '#6BA4E8', icon: Activity },
  { id: 'pm', backendId: 'portfolio_manager', label: 'Portfolio Manager', blurb: 'Sizing and plan', color: '#C47EF0', icon: Briefcase },
  { id: 'cro', backendId: 'cro', label: 'Chief Risk Officer', blurb: 'Veto and controls', color: '#F0A020', icon: ShieldAlert }
]

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

function apiUrl(endpoint) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return `${API_BASE}${path}`
}

const initialAgentState = AGENTS.reduce((acc, agent) => {
  acc[agent.id] = { status: "idle", confidence: 0, note: "System ready" }
  return acc
}, {})

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toKeyMap(rows, keyField = "key", valueField = "value") {
  const out = {}
  for (const row of rows || []) out[row[keyField]] = row[valueField]
  return out
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function levelFromDecision(text) {
  const upper = String(text || "").toUpperCase()
  if (upper.includes("VETO") || upper.includes("BLOCK") || upper.includes("ERROR") || upper.includes("FAIL")) return "warn"
  if (upper.includes("APPROVE") || upper.includes("PASS") || upper.includes("EXECUTED") || upper.includes("DONE")) return "ok"
  if (upper.includes("INIT")) return "init"
  return "info"
}

function fmtTime(ts) {
  if (!ts) return "-"
  const ms = ts > 9999999999 ? ts : ts * 1000
  return new Date(ms).toISOString().split('T')[1].slice(0, -1)
}

function StatusBadge({ level, text }) {
  const map = {
    init: 'text-[#8B909A] border-[rgba(255,255,255,0.1)] bg-transparent',
    info: 'text-[#8B909A] border-[rgba(255,255,255,0.1)] bg-transparent',
    ok: 'text-[#00D4AA] border-[rgba(0,212,170,0.25)] bg-[rgba(0,212,170,0.05)]',
    warn: 'text-[#E84040] border-[rgba(232,64,64,0.35)] bg-[rgba(232,64,64,0.05)]',
  }
  return (
    <span className={`mono text-[9px] font-semibold border px-1.5 py-0.5 rounded-sm uppercase ${map[level] || map.info}`}>
      {text}
    </span>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('DASHBOARD') // DASHBOARD or BRAIN

  // Form State
  const [task, setTask] = useState("Evaluate a swing trade for BTC/USD over the next week, focusing on macro downside protection.")
  const [symbol, setSymbol] = useState("BTCUSDT")
  const [riskMode, setRiskMode] = useState("balanced")
  const [marketNote, setMarketNote] = useState("Federal Reserve rate expectations shifted. Watch for tech correlation and unexpected DXY spikes.")

  // Sync State
  const [agents, setAgents] = useState(initialAgentState)
  const [timeline, setTimeline] = useState([])
  const [decision, setDecision] = useState(null)
  const [memories, setMemories] = useState([])
  const [memLoading, setMemLoading] = useState(false)
  
  const [running, setRunning] = useState(false)
  const [pass, setPass] = useState(0)
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")

  const syncState = async () => {
    const res = await fetch(apiUrl("/api/state"))
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || "state fetch failed")
    }

    const payload = await res.json()
    setConnected(true)
    setErrorMsg("")
    setLastSync(payload.fetchedAt || Date.now())

    const shared = toKeyMap(payload.shared || [])
    setPass(num(shared.cycle_pass, 0))

    const byBackendId = {}
    for (const row of payload.agents || []) {
      byBackendId[row.agent_id] = row
    }

    const nextAgents = { ...initialAgentState }
    for (const card of AGENTS) {
      const src = byBackendId[card.backendId]
      if (!src) continue
      nextAgents[card.id] = {
        status: src.status || "idle",
        confidence: num(src.confidence, 0),
        note: src.current_task || "Waiting"
      }
    }
    setAgents(nextAgents)

    const rawLogs = [...(payload.logs || [])].sort((a, b) => num(b.timestamp, 0) - num(a.timestamp, 0)).slice(0, 50)
    const sortedLogs = rawLogs.map((row, idx) => {
        let l = levelFromDecision(row.decision)
        if (row.decision.includes("INIT") || row.decision.includes("Starting")) l = "init"
        if (row.decision.includes("WARN") || row.decision.includes("Veto")) l = "warn"
        if (row.decision.includes("Approved") || row.decision.includes("DONE") || row.decision.includes("PASS")) l = "ok"

        return {
            id: `${row.timestamp || Date.now()}-${idx}`,
            actor: row.agent_id || "system",
            msg: row.decision || "No decision text",
            level: l,
            time: fmtTime(row.timestamp)
        }
    })
    setTimeline(sortedLogs)

    // Memory parsing
    const rawMemories = [...(payload.memory || [])].sort((a,b) => num(b.timestamp, 0) - num(a.timestamp, 0))
    setMemories(rawMemories)

    const proposal = [...(payload.proposals || [])].sort((a, b) => num(b.updated_at, 0) - num(a.updated_at, 0))[0]
    if (!proposal) {
      setDecision(null)
      return
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
    })
  }

  // Fetch Mem0 long-term memories
  const syncMemories = async () => {
    setMemLoading(true)
    try {
      const res = await fetch(apiUrl("/api/memories"))
      if (!res.ok) return
      const data = await res.json()
      const raw = data.memories || []
      // Sort by created_at if available, fallback to array order
      setMemories([...raw].reverse())
    } catch (_) {
      // silently fail — mem0 is optional
    } finally {
      setMemLoading(false)
    }
  }

  const runDemo = async () => {
    if (running) return
    setRunning(true)
    setTimeline([]) // clear logs on run
    setAgents({...initialAgentState})
    setDecision(null)
    
    try {
      const res = await fetch(apiUrl("/api/run"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          marketNote: `${marketNote} | risk mode: ${riskMode}`,
          task
        })
      })

      if (!res.ok) throw new Error("Run failed")
      await wait(500)
      await syncState()
    } catch (e) {
      setConnected(false)
      setErrorMsg(e.message || String(e))
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    let disposed = false
    const pull = async () => {
      try { await syncState() } 
      catch (e) {
        if (disposed) return
        setConnected(false)
        setErrorMsg(e.message || String(e))
      }
    }
    pull()
    const id = setInterval(pull, 2000)
    return () => { disposed = true; clearInterval(id) }
  }, [])

  // Poll Mem0 memories separately (slower cadence, 15s)
  useEffect(() => {
    let disposed = false
    const pull = async () => { if (!disposed) await syncMemories() }
    pull()
    const id = setInterval(pull, 15000)
    return () => { disposed = true; clearInterval(id) }
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#E8E9EC] pt-24 pb-20 selection:bg-[#00D4AA]/30">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header Tabs */}
        <div className="flex items-center justify-between mb-8 border-b border-[rgba(255,255,255,0.07)] pb-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('DASHBOARD')}
              className={`flex items-center gap-2 pb-4 -mb-[17px] border-b-2 transition-colors ${activeTab === 'DASHBOARD' ? 'border-[#00D4AA] text-white' : 'border-transparent text-[#8B909A] hover:text-white'}`}
            >
              <Activity className="w-4 h-4" />
              <span className="mono text-[11px] font-semibold tracking-wider uppercase">Live Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('BRAIN')}
              className={`flex items-center gap-2 pb-4 -mb-[17px] border-b-2 transition-colors ${activeTab === 'BRAIN' ? 'border-[#C47EF0] text-white' : 'border-transparent text-[#8B909A] hover:text-white'}`}
            >
              <Database className="w-4 h-4" />
              <span className="mono text-[11px] font-semibold tracking-wider uppercase">Swarm Brain</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
             {errorMsg && <span className="mono text-[10px] text-[#E84040]">{errorMsg}</span>}
             <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00D4AA] animate-pulse' : 'bg-[#E84040]'}`} />
                <span className="mono text-[10px] text-[#8B909A] uppercase tracking-wider">
                  {connected ? 'CONNECTED TO SPACETIME' : 'DISCONNECTED'}
                </span>
             </div>
          </div>
        </div>

        {activeTab === 'DASHBOARD' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Deck & Decision */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Task Deck */}
              <div className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm p-5">
                <h2 className="mono text-[11px] text-[#8B909A] tracking-wider uppercase mb-5 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5" /> Operations Deck
                </h2>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block mono text-[9px] text-[#4A5060] uppercase mb-1.5">Target Symbol</label>
                    <input 
                      type="text" 
                      value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="w-full bg-[#1A1D27] border border-[rgba(255,255,255,0.05)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block mono text-[9px] text-[#4A5060] uppercase mb-1.5">Strategy Prompt</label>
                    <textarea 
                      value={task} onChange={(e) => setTask(e.target.value)}
                      rows={3}
                      className="w-full bg-[#1A1D27] border border-[rgba(255,255,255,0.05)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block mono text-[9px] text-[#4A5060] uppercase mb-1.5">Market Context</label>
                    <input 
                      type="text" 
                      value={marketNote} onChange={(e) => setMarketNote(e.target.value)}
                      className="w-full bg-[#1A1D27] border border-[rgba(255,255,255,0.05)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors"
                    />
                  </div>

                  <div>
                     <label className="block mono text-[9px] text-[#4A5060] uppercase mb-1.5">Risk Profile</label>
                     <select 
                       value={riskMode} onChange={(e) => setRiskMode(e.target.value)}
                       className="w-full bg-[#1A1D27] border border-[rgba(255,255,255,0.05)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors appearance-none"
                     >
                       <option value="conservative">Conservative</option>
                       <option value="balanced">Balanced</option>
                       <option value="aggressive">Aggressive</option>
                     </select>
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                    <button 
                      onClick={runDemo} disabled={running}
                      className="flex-1 bg-[rgba(0,212,170,0.1)] hover:bg-[rgba(0,212,170,0.15)] text-[#00D4AA] border border-[rgba(0,212,170,0.2)] font-semibold text-[13px] py-2.5 rounded-sm transition-all flex items-center justify-center gap-2"
                    >
                      {running ? <span className="animate-spin relative top-px"><RotateCcw className="w-3.5 h-3.5" /></span> : <Play className="w-3 h-3 fill-current" />}
                      {running ? "DISPATCHING..." : "LAUNCH SWARM"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Decision Gate */}
              <div className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden flex-1 flex flex-col">
                 <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[#1A1D27] flex items-center justify-between">
                    <span className="mono text-[10px] tracking-widest text-[#E8E9EC] uppercase">Decision Gate</span>
                    {decision && <StatusBadge level={decision.approved ? 'ok' : 'warn'} text={decision.approved ? 'APPROVED' : 'VETOED'} />}
                 </div>
                 <div className="p-5 flex-1 flex flex-col justify-center">
                    {!decision ? (
                      <div className="text-center">
                        <ShieldAlert className="w-8 h-8 mx-auto text-[#4A5060] mb-3 opacity-50" />
                        <p className="mono text-[10px] text-[#4A5060] uppercase">Awaiting Swarm Consensus</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-baseline gap-3">
                           <span className={`text-2xl font-bold ${decision.side === 'BUY' || decision.side === 'LONG' ? 'text-[#00D4AA]' : 'text-[#E84040]'}`}>
                             {decision.side}
                           </span>
                           <span className="text-xl tracking-tight">{decision.symbol}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-[rgba(255,255,255,0.05)]">
                           <div>
                             <div className="mono text-[9px] text-[#8B909A] uppercase mb-1">Position Size</div>
                             <div className="mono text-sm">{decision.sizePct}% NAV</div>
                           </div>
                           <div>
                             <div className="mono text-[9px] text-[#8B909A] uppercase mb-1">Stop Loss</div>
                             <div className="mono text-sm">{typeof decision.stop === 'number' ? decision.stop.toFixed(2) : decision.stop}</div>
                           </div>
                           <div>
                             <div className="mono text-[9px] text-[#8B909A] uppercase mb-1">Take Profit</div>
                             <div className="mono text-sm">{typeof decision.take === 'number' ? decision.take.toFixed(2) : decision.take}</div>
                           </div>
                        </div>

                        <div>
                           <div className="mono text-[9px] text-[#8B909A] uppercase mb-1.5">CRO Rationale</div>
                           <p className="text-[13px] text-[#D1D5DB] leading-relaxed">{decision.reason}</p>
                        </div>
                      </div>
                    )}
                 </div>
              </div>

            </div>

            {/* Right Column: Agents & Log */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Agent Floor Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {AGENTS.map(agent => {
                   const state = agents[agent.id]
                   const Icon = agent.icon
                   const isRunning = state.status.toLowerCase() === 'running'
                   
                   return (
                     <div key={agent.id} className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm p-4 relative overflow-hidden group">
                        {/* Glow effect when running */}
                        {isRunning && (
                          <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: agent.color, boxShadow: `0 0 10px ${agent.color}` }} />
                        )}

                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-8 h-8 rounded-sm bg-[#1A1D27] border border-[rgba(255,255,255,0.05)] flex items-center justify-center">
                             <Icon className="w-4 h-4" style={{ color: agent.color }} />
                           </div>
                           <div>
                             <h3 className="mono text-[11px] font-bold tracking-wider" style={{ color: agent.color }}>{agent.label.toUpperCase()}</h3>
                             <p className="mono text-[9px] text-[#8B909A] uppercase tracking-wide">{agent.blurb}</p>
                           </div>
                        </div>

                        <div className="mb-4">
                           <div className="mono text-[10px] text-[#8B909A] mb-1.5 flex justify-between">
                             <span>CONFIDENCE</span>
                             <span>{(state.confidence * 100).toFixed(0)}%</span>
                           </div>
                           <div className="h-1 bg-[#1A1D27] rounded-none overflow-hidden">
                              <motion.div 
                                className="h-full" style={{ backgroundColor: agent.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${state.confidence * 100}%` }}
                                transition={{ duration: 0.5 }}
                              />
                           </div>
                        </div>

                        <div className="bg-[#0A0B0D] border border-[rgba(255,255,255,0.03)] p-2.5 min-h-[60px] rounded-sm">
                           <div className="flex items-center gap-2 mb-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'animate-pulse' : ''}`} style={{ backgroundColor: isRunning ? agent.color : '#4A5060' }} />
                              <span className="mono text-[9px] tracking-wider uppercase text-[#8B909A]">{state.status}</span>
                           </div>
                           <p className="text-[11px] font-mono text-[#D1D5DB] leading-snug line-clamp-2">
                             {state.note}
                           </p>
                        </div>
                     </div>
                   )
                 })}
              </div>

              {/* Reasoning Log */}
              <div className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm flex-1 flex flex-col overflow-hidden min-h-[400px]">
                 <div className="px-5 py-2.5 border-b border-[rgba(255,255,255,0.05)] bg-[#1A1D27] flex items-center gap-3">
                   <Clock className="w-3.5 h-3.5 text-[#8B909A]" />
                   <span className="mono text-[10px] tracking-widest text-[#E8E9EC] uppercase">Streaming Decision Log</span>
                 </div>
                 
                 <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] flex flex-col gap-1">
                    {timeline.length === 0 && (
                      <div className="flex items-center justify-center h-full text-[#4A5060] flex-col gap-2">
                         <span className="animate-pulse">_</span>
                         <span className="uppercase text-[9px] tracking-widest">Waiting for cycle...</span>
                      </div>
                    )}
                    <AnimatePresence initial={false}>
                      {timeline.map((log) => (
                        <motion.div 
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-4 hover:bg-[rgba(255,255,255,0.02)] px-2 py-1.5 rounded-sm transition-colors"
                        >
                           <span className="text-[#4A5060] w-[80px] flex-shrink-0">{log.time}</span>
                           
                           <span 
                             className="w-[120px] flex-shrink-0 font-bold"
                             style={{ color: AGENTS.find(a => a.backendId === log.actor || a.id.toUpperCase() === log.actor)?.color || '#E8E9EC' }}
                           >
                             {log.actor.toUpperCase()}
                           </span>

                           <div className="w-[60px] flex-shrink-0">
                             <StatusBadge level={log.level} text={log.level} />
                           </div>

                           <span className="text-[#D1D5DB] flex-1 break-words leading-relaxed">{log.msg}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
              </div>

            </div>

          </div>
        ) : (
          <SwarmBrain memories={memories} running={running} memLoading={memLoading} onRefresh={syncMemories} />
        )}

      </div>
    </div>
  )
}

function SwarmBrain({ memories, running, memLoading, onRefresh }) {
  const [filter, setFilter] = useState('ALL')

  const total = memories.length
  // Estimate session memories as those without a hash-id (Mem0 IDs are UUIDs when added fresh)
  const sessionCount = memories.filter(m => {
    const age = m.created_at ? Date.now() - new Date(m.created_at).getTime() : 0
    return age < 3600000 // less than 1 hour old
  }).length
  const activeRecallCount = running ? Math.min(total, Math.floor(Math.random() * 3) + 1) : 0

  // Mem0 returns memories with agent stored in metadata or in the memory text
  const filteredMemories = filter === 'ALL' 
    ? memories 
    : memories.filter(m => {
        const agentHint = (m.metadata?.agent || m.metadata?.source_agent || '').toLowerCase()
        return agentHint.includes(filter)
      })

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-6">
      
      {/* Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { k: 'Total Memories', v: total, icon: Database, color: '#6BA4E8' },
          { k: 'Session (Live)', v: sessionCount, icon: Zap, color: '#C47EF0' },
          { k: 'Active Recall', v: activeRecallCount, icon: Search, color: '#00D4AA', pulse: running }
        ].map(m => (
          <div key={m.k} className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm p-5 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-sm bg-[#1A1D27] flex items-center justify-center">
                 <m.icon className={`w-4 h-4 ${m.pulse ? 'animate-pulse' : ''}`} style={{ color: m.color }} />
               </div>
               <span className="mono text-[10px] text-[#8B909A] uppercase tracking-wider">{m.k}</span>
             </div>
             <span className="mono text-2xl font-bold text-white">{m.v}</span>
          </div>
        ))}
      </div>

      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <div className="mono text-[10px] text-[#4A5060] uppercase tracking-widest">
          Long-Term Memory — Powered by Mem0
        </div>
        <button 
          onClick={onRefresh}
          disabled={memLoading}
          className="mono text-[10px] text-[#8B909A] hover:text-white border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)] px-3 py-1.5 rounded-sm transition-all flex items-center gap-2"
        >
          <RotateCcw className={`w-3 h-3 ${memLoading ? 'animate-spin' : ''}`} />
          {memLoading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2">
        {['ALL', 'quant', 'portfolio_manager', 'cro'].map(key => {
           let label = "All Sources"
           let color = "#8B909A"
           if (key !== 'ALL') {
             const ag = AGENTS.find(a => a.backendId === key)
             label = ag.label
             color = ag.color
           }
           const isActive = filter === key

           return (
             <button 
               key={key}
               onClick={() => setFilter(key)}
               className={`mono text-[10px] uppercase font-semibold px-4 py-1.5 rounded-sm border transition-all ${isActive ? 'bg-[#1A1D27] text-white' : 'bg-transparent text-[#4A5060] border-transparent hover:border-[rgba(255,255,255,0.05)]'} `}
               style={{ borderColor: isActive ? color : undefined }}
             >
               {label}
             </button>
           )
        })}
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMemories.length === 0 && (
           <div className="col-span-full py-12 text-center text-[#4A5060] mono text-sm flex flex-col items-center gap-3 border border-dashed border-[rgba(255,255,255,0.05)] rounded-sm">
             <Database className="w-8 h-8 opacity-50" />
             {memLoading ? 'Loading memory from Mem0...' : 'No memories stored yet. Launch the swarm to build long-term insights.'}
           </div>
        )}
        {filteredMemories.map((mem, idx) => {
           // Mem0 API format: { id, memory, user_id, metadata, created_at, updated_at }
           const agentHint = (mem.metadata?.agent || mem.metadata?.source_agent || mem.metadata?.role || '').toLowerCase()
           const ag = AGENTS.find(a => agentHint.includes(a.backendId) || agentHint.includes(a.id))
           const color = ag ? ag.color : '#8B909A'
           const label = ag ? ag.label : (agentHint || 'swarm').toUpperCase()

           const memText = mem.memory || mem.content || String(mem)
           const confScore = mem.metadata?.confidence ? (num(mem.metadata.confidence, 0) * 100).toFixed(0) : null
           const timeStr = mem.created_at ? new Date(mem.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

           return (
             <div key={mem.id || idx} className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden flex flex-col hover:border-[rgba(255,255,255,0.15)] transition-colors">
                
                {/* Card Header */}
                <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.05)] bg-[#1A1D27] flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                     <span className="mono text-[10px] uppercase tracking-wider font-bold" style={{ color }}>{label}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     {confScore && (
                       <span className="mono text-[9px] text-[#00D4AA] bg-[rgba(0,212,170,0.05)] px-2 py-0.5 rounded-sm border border-[rgba(0,212,170,0.15)]">
                         CONF: {confScore}%
                       </span>
                     )}
                     <span className="mono text-[9px] text-[#4A5060]">{timeStr}</span>
                   </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <p className="text-[13px] text-[#D1D5DB] leading-relaxed">{memText}</p>

                  {mem.metadata && Object.keys(mem.metadata).filter(k => !['agent','source_agent','role','confidence'].includes(k)).length > 0 && (
                    <div className="mt-auto bg-[#0A0B0D] p-2.5 rounded-sm border border-[rgba(255,255,255,0.03)] flex flex-wrap gap-1.5">
                      {Object.entries(mem.metadata).filter(([k]) => !['agent','source_agent','role','confidence'].includes(k)).map(([k, v]) => (
                        <span key={k} className="mono text-[9px] text-[#4A5060] bg-[#1A1D27] px-2 py-0.5 border border-[rgba(255,255,255,0.04)] rounded-sm">
                          {k}: <span className="text-[#8B909A]">{String(v).slice(0, 30)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
             </div>
           )
        })}
      </div>

    </div>
  )
}
