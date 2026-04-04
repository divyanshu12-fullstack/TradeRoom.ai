import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ArrowDown, ArrowUp } from 'lucide-react'

/* ─── Static order-book data ─── */
const ASKS = [
  { price: '47,826.50', size: '0.142', total: '6.78K', depth: 18 },
  { price: '47,824.00', size: '0.387', total: '18.47K', depth: 35 },
  { price: '47,821.50', size: '0.891', total: '42.41K', depth: 62 },
  { price: '47,819.00', size: '1.340', total: '63.78K', depth: 80 },
  { price: '47,817.00', size: '2.014', total: '95.89K', depth: 100 },
]

const BIDS = [
  { price: '47,814.00', size: '1.876', total: '89.35K', depth: 100 },
  { price: '47,812.50', size: '1.203', total: '57.23K', depth: 64 },
  { price: '47,810.00', size: '0.744', total: '35.41K', depth: 40 },
  { price: '47,808.00', size: '0.421', total: '20.03K', depth: 22 },
  { price: '47,806.50', size: '0.187', total: '8.85K', depth: 10 },
]

/* ─── Agent log entries ─── */
const INITIAL_LOGS = [
  { ts: '09:42:31.004', agent: 'QUANT', level: 'INIT', msg: 'Fetching latest state from SpaceTimeDB...' },
  { ts: '09:42:31.108', agent: 'QUANT', level: 'INFO', msg: 'Market thesis: BTC/USD bearish divergence on 4H RSI' },
  { ts: '09:42:31.210', agent: 'QUANT', level: 'DONE', msg: 'Confidence: 0.81 | Signal: SHORT_SETUP' },
  { ts: '09:42:31.312', agent: 'PM   ', level: 'INIT', msg: 'Constructing trade plan from QUANT thesis...' },
  { ts: '09:42:31.445', agent: 'PM   ', level: 'INFO', msg: 'Position: SHORT 2.4% NAV @ 47,817.00 | SL: 48,100' },
  { ts: '09:42:31.556', agent: 'PM   ', level: 'DONE', msg: 'Plan serialised. Passing to CRO for risk eval.' },
  { ts: '09:42:31.680', agent: 'CRO  ', level: 'INIT', msg: 'Evaluating risk parameters and conflict signals...' },
  { ts: '09:42:31.812', agent: 'CRO  ', level: 'WARN', msg: 'Open exposure 18.2% NAV — within threshold (<25%)' },
  { ts: '09:42:31.891', agent: 'CRO  ', level: 'PASS', msg: 'Risk gate cleared. Decision: EXECUTE' },
]

function AgentLevelBadge({ level }) {
  const map = {
    INIT: 'text-[#8B909A] border-[rgba(255,255,255,0.1)]',
    INFO: 'text-[#8B909A] border-[rgba(255,255,255,0.1)]',
    DONE: 'text-[#00D4AA] border-[rgba(0,212,170,0.25)]',
    WARN: 'text-[#F0A020] border-[rgba(240,160,32,0.25)]',
    PASS: 'text-[#00D4AA] border-[rgba(0,212,170,0.35)]',
    FAIL: 'text-[#E84040] border-[rgba(232,64,64,0.35)]',
  }
  return (
    <span className={`mono text-[9px] font-medium border px-1.5 py-0 rounded-sm uppercase ${map[level] || map.INFO}`}>
      {level}
    </span>
  )
}

function AgentColor({ agent }) {
  const trim = agent.trim()
  if (trim === 'QUANT') return <span className="text-[#6BA4E8]">{agent}</span>
  if (trim === 'PM')    return <span className="text-[#C47EF0]">{agent}</span>
  if (trim === 'CRO')   return <span className="text-[#F0A020]">{agent}</span>
  return <span>{agent}</span>
}

export default function Hero({ onViewDemo }) {
  // Index-based approach: never mutate to an empty array, so log is never undefined
  const [headIdx, setHeadIdx] = useState(3)
  const [cursor, setCursor] = useState(true)
  const logRef = useRef(null)
  const N = INITIAL_LOGS.length
  const VISIBLE = 6

  // Derive the visible log window from the current head index
  const logs = Array.from({ length: VISIBLE }, (_, i) => {
    const idx = (headIdx - VISIBLE + 1 + i + N * 10) % N
    return INITIAL_LOGS[idx]
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadIdx((prev) => (prev + 1) % N)
    }, 900)
    return () => clearInterval(interval)
  }, [N])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [headIdx])

  useEffect(() => {
    const t = setInterval(() => setCursor((c) => !c), 500)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="pt-28 pb-16 px-6 bg-[#0A0B0D]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* ── LEFT: Copy ── */}
          <div>
            {/* Category label */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />
              <span className="mono text-[10px] font-medium tracking-[0.15em] text-[#00D4AA] uppercase">
                Autonomous Trading Orchestration Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-[42px] md:text-[52px] font-bold leading-[1.1] tracking-[-0.02em] text-[#E8E9EC] mb-5"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Three-agent sequential pipeline
              <br />
              <span className="text-[#E8E9EC]">with deterministic risk gates.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="text-[15px] text-[#8B909A] leading-[1.65] mb-8 max-w-xl"
            >
              TradeRoom.ai separates market analysis, trade construction, and risk 
              evaluation into three deterministic agent roles sharing synchronized 
              state via SpaceTimeDB. No trade executes without explicit CRO approval.
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
              className="flex items-center gap-3 mb-12"
            >
              <button onClick={onViewDemo} className="btn-primary">
                Launch Live Demo <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <a href="#solution" className="btn-ghost">
                View Architecture
              </a>
            </motion.div>

            {/* Dense metrics row — terminal readout */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm"
            >
              <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2">
                <span className="mono text-[10px] tracking-widest text-[#4A5060] uppercase">System Metrics</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[rgba(255,255,255,0.05)]">
                {[
                  { k: 'Agents',         v: '3',       sub: 'Quant · PM · CRO' },
                  { k: 'State Sync',     v: '11ms',    sub: 'SpaceTimeDB' },
                  { k: 'Swarm Cycle',    v: '887ms',   sub: 'Avg. end-to-end' },
                  { k: 'Risk Gate',      v: '100%',    sub: 'Coverage rate', accentVal: true },
                ].map((m) => (
                  <div key={m.k} className="px-5 py-3">
                    <div className="mono text-[10px] text-[#4A5060] uppercase tracking-wide mb-1">{m.k}</div>
                    <div className={`mono text-[18px] font-semibold tabular-nums ${m.accentVal ? 'text-[#00D4AA]' : 'text-[#E8E9EC]'}`}>
                      {m.v}
                    </div>
                    <div className="mono text-[9px] text-[#4A5060] mt-0.5">{m.sub}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: Terminal panels ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Order book */}
            <div className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.07)] bg-[#1A1D27]">
                <div className="flex items-center gap-3">
                  <span className="mono text-[10px] font-medium text-[#E8E9EC] tracking-widest">ORDER BOOK</span>
                  <span className="tag">BTC / USD</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono text-[11px] font-semibold text-[#E8E9EC]">47,815.75</span>
                  <span className="mono text-[10px] text-[#E84040] flex items-center gap-0.5">
                    <ArrowDown className="w-2.5 h-2.5" />0.43%
                  </span>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-4 gap-0 px-4 py-1.5 border-b border-[rgba(255,255,255,0.04)]">
                {['Price (USD)', 'Size (BTC)', 'Total', 'Depth'].map((h, i) => (
                  <div key={h} className={`mono text-[9px] text-[#4A5060] uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Asks */}
              {ASKS.map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-0 px-4 py-1 relative trow group">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[rgba(232,64,64,0.05)]"
                    style={{ width: `${row.depth}%` }}
                  />
                  <span className="mono text-[11px] text-[#E84040] relative z-10">{row.price}</span>
                  <span className="mono text-[11px] text-[#8B909A] text-right relative z-10">{row.size}</span>
                  <span className="mono text-[11px] text-[#4A5060] text-right relative z-10">{row.total}</span>
                  <div className="flex justify-end items-center relative z-10">
                    <div className="h-1 bg-[rgba(232,64,64,0.35)] rounded-none" style={{ width: `${row.depth}%`, maxWidth: '60px' }} />
                  </div>
                </div>
              ))}

              {/* Spread */}
              <div className="px-4 py-1.5 bg-[#1A1D27] flex items-center justify-between border-y border-[rgba(255,255,255,0.06)]">
                <span className="mono text-[9px] text-[#4A5060] uppercase">Spread</span>
                <span className="mono text-[10px] text-[#8B909A]">$3.25 · 0.007%</span>
                <span className="mono text-[9px] text-[#4A5060] uppercase">Depth Chart</span>
              </div>

              {/* Bids */}
              {BIDS.map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-0 px-4 py-1 relative trow group">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[rgba(0,212,170,0.05)]"
                    style={{ width: `${row.depth}%` }}
                  />
                  <span className="mono text-[11px] text-[#00D4AA] relative z-10">{row.price}</span>
                  <span className="mono text-[11px] text-[#8B909A] text-right relative z-10">{row.size}</span>
                  <span className="mono text-[11px] text-[#4A5060] text-right relative z-10">{row.total}</span>
                  <div className="flex justify-end items-center relative z-10">
                    <div className="h-1 bg-[rgba(0,212,170,0.3)] rounded-none" style={{ width: `${row.depth}%`, maxWidth: '60px' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Agent log panel */}
            <div className="bg-[#0A0B0D] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.07)] bg-[#0F1117]">
                <span className="mono text-[10px] font-medium text-[#E8E9EC] tracking-widest">SWARM DECISION LOG</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" style={{ boxShadow: '0 0 4px #00D4AA' }} />
                  <span className="mono text-[9px] text-[#00D4AA] uppercase">Live</span>
                </div>
              </div>

              <div
                ref={logRef}
                className="h-[148px] overflow-y-auto p-3 flex flex-col gap-1"
                style={{ scrollBehavior: 'smooth' }}
              >
                {logs.filter(Boolean).map((log, i) => (
                  <motion.div
                    key={`${log.ts}-${i}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 text-[10px] font-mono"
                  >
                    <span className="text-[#4A5060] flex-shrink-0 tabular-nums">{log.ts}</span>
                    <span className="w-[36px] text-right flex-shrink-0"><AgentColor agent={log.agent} /></span>
                    <AgentLevelBadge level={log.level} />
                    <span className="text-[#8B909A] truncate">{log.msg}</span>
                  </motion.div>
                ))}
                {/* Cursor */}
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-[#4A5060]">{'>'}</span>
                  <span className={`text-[#00D4AA] ${cursor ? 'opacity-100' : 'opacity-0'}`}>█</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
