import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const AGENTS = [
  {
    id:     'AGT-001',
    name:   'QUANT',
    role:   'Signal Analyst',
    status: 'ACTIVE',
    color:  '#6BA4E8',
    fields: [
      { k: 'Primary function', v: 'Live market & sentiment signal interpretation' },
      { k: 'Input sources',    v: 'SpaceTimeDB · Binance WS · Mem0 recall' },
      { k: 'Output schema',    v: '{thesis, confidence, signal_type, timestamp}' },
      { k: 'Prompt scope',     v: 'Signal-only. No position sizing. No risk eval.' },
      { k: 'Mem0 integration', v: 'Retrieves similar past market structures' },
    ],
    output: '{ "thesis": "bearish_divergence", "confidence": 0.81, "signal": "SHORT_SETUP" }',
  },
  {
    id:     'AGT-002',
    name:   'PM',
    role:   'Portfolio Manager',
    status: 'ACTIVE',
    color:  '#C47EF0',
    fields: [
      { k: 'Primary function', v: 'Trade plan construction from QUANT thesis' },
      { k: 'Input sources',    v: 'QUANT output · Portfolio state · Exposure limits' },
      { k: 'Output schema',    v: '{entry, size_pct_nav, sl, tp, intent, rationale}' },
      { k: 'Prompt scope',     v: 'Sizing and execution. No market reading. No veto.' },
      { k: 'Constraint',       v: 'Max single-position: 5% NAV. Max total: 25% NAV.' },
    ],
    output: '{ "intent": "SHORT", "size_pct": 2.4, "entry": 47817.00, "sl": 48100, "tp": 47200 }',
  },
  {
    id:     'AGT-003',
    name:   'CRO',
    role:   'Chief Risk Officer',
    status: 'GATE',
    color:  '#F0A020',
    fields: [
      { k: 'Primary function', v: 'Risk challenge, veto authority, conflict detection' },
      { k: 'Input sources',    v: 'PM plan · Portfolio exposure · Risk thresholds' },
      { k: 'Output schema',    v: '{verdict, risk_flags[], confidence_override, log}' },
      { k: 'Veto mechanism',   v: 'REJECT verdict halts execution unconditionally.' },
      { k: 'Mem0 integration', v: 'Flags if similar plan was rejected previously.' },
    ],
    output: '{ "verdict": "EXECUTE", "risk_flags": ["open_exp_18.2%"], "confidence": 0.79 }',
  },
]

function AgentCard({ agent, index, inView }) {
  const statusColor = agent.status === 'GATE' ? '#F0A020' : '#00D4AA'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-[#0A0B0D] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden flex flex-col"
    >
      {/* Card header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.07)', borderTop: `2px solid ${agent.color}` }}
      >
        <div className="flex items-center gap-3">
          <span className="mono text-[10px] text-[#4A5060]">{agent.id}</span>
          <span
            className="mono text-[11px] font-semibold tracking-[0.08em]"
            style={{ color: agent.color }}
          >
            {agent.name}
          </span>
          <span className="mono text-[10px] text-[#8B909A]">· {agent.role}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          <span className="mono text-[9px] uppercase tracking-widest" style={{ color: statusColor }}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Fields — structured data rows */}
      <div className="divide-y divide-[rgba(255,255,255,0.04)] flex-1">
        {agent.fields.map((f) => (
          <div key={f.k} className="grid grid-cols-5 gap-0 px-4 py-2.5">
            <div className="col-span-2">
              <span className="mono text-[10px] text-[#4A5060] uppercase tracking-wide">{f.k}</span>
            </div>
            <div className="col-span-3">
              <span className="mono text-[11px] text-[#8B909A] leading-tight">{f.v}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Output example */}
      <div className="px-4 py-3 bg-[#0F1117] border-t border-[rgba(255,255,255,0.05)]">
        <p className="mono text-[9px] text-[#4A5060] uppercase tracking-wider mb-1.5">Sample output</p>
        <code
          className="mono text-[10px] leading-relaxed block"
          style={{ color: agent.color, opacity: 0.8 }}
        >
          {agent.output}
        </code>
      </div>
    </motion.div>
  )
}

export default function Solution() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="solution" ref={ref} className="py-20 px-6 bg-[#0A0B0D] border-t border-[rgba(255,255,255,0.07)]">
      <div className="max-w-7xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <p className="label mb-2">System Architecture</p>
            <h2 className="text-[28px] font-bold tracking-tight text-[#E8E9EC]">
              Decoupled agent roles with enforced execution boundaries
            </h2>
          </div>
          <span className="tag hidden md:inline-block">3 agents · Sequential</span>
        </motion.div>

        <div className="divider mb-8" />

        {/* Sequential flow badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-2 mb-6 flex-wrap"
        >
          {['QUANT reads state', '→', 'PM constructs plan', '→', 'CRO evaluates risk', '→', 'Execute or Reject'].map(
            (item, i) =>
              item === '→' ? (
                <span key={i} className="text-[#4A5060] text-sm">→</span>
              ) : (
                <span key={i} className="tag">{item}</span>
              )
          )}
          <span className="tag-accent ml-2">Deterministic · No shortcuts</span>
        </motion.div>

        {/* 3-column agent cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AGENTS.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} inView={inView} />
          ))}
        </div>

        {/* CRO veto principle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="flex items-start gap-3 px-5 py-4 bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] mt-1.5 flex-shrink-0" />
            <div>
              <p className="mono text-[10px] text-[#4A5060] uppercase tracking-wider mb-1">Veto Mechanism</p>
              <p className="text-[12px] text-[#8B909A] leading-relaxed">
                CRO <code className="mono text-[#E84040]">REJECT</code> verdict unconditionally halts execution. 
                No override path exists. The failed plan is written to Mem0 with full rationale for future recall.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-5 py-4 bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6BA4E8] mt-1.5 flex-shrink-0" />
            <div>
              <p className="mono text-[10px] text-[#4A5060] uppercase tracking-wider mb-1">Memory Integration</p>
              <p className="text-[12px] text-[#8B909A] leading-relaxed">
                Both QUANT and CRO query Mem0 for semantically similar past situations before calling Gemini, 
                injecting historical context without expanding the primary prompt window.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
