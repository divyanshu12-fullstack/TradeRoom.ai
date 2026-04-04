import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const PROBLEMS = [
  {
    id: 'P-001',
    title: 'Single-model cognitive overload',
    severity: 'HIGH',
    description:
      'Assigning signal interpretation, strategy formulation, and risk evaluation to a single LLM prompt results in context fragmentation and degraded reasoning quality under mixed-signal conditions.',
    affected: 'All single-agent architectures',
  },
  {
    id: 'P-002',
    title: 'Absent cross-session memory',
    severity: 'HIGH',
    description:
      'Systems without persistent semantic memory repeat identical error patterns across sessions. Known failure modes (trap patterns, liquidity traps) are re-encountered without any recall of prior incidents.',
    affected: 'Stateless LLM API integrations',
  },
  {
    id: 'P-003',
    title: 'Stale shared state at decision time',
    severity: 'CRITICAL',
    description:
      'Multi-service architectures with high inter-layer latency produce decisions based on lagged market state. In intraday trading, state delays exceeding 50ms generate materially incorrect execution signals.',
    affected: 'REST-based distributed systems',
  },
]

const SEV = {
  CRITICAL: 'text-[#E84040] border-[rgba(232,64,64,0.35)]',
  HIGH:     'text-[#F0A020] border-[rgba(240,160,32,0.35)]',
  MEDIUM:   'text-[#8B909A] border-[rgba(139,144,154,0.25)]',
}

export default function Problem() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="problem" ref={ref} className="py-20 px-6 bg-[#0F1117] border-t border-[rgba(255,255,255,0.07)]">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <p className="label mb-2">Problem Statement</p>
            <h2 className="text-[28px] font-bold tracking-tight text-[#E8E9EC]">
              Systemic failure modes in autonomous trading systems
            </h2>
          </div>
          <span className="tag hidden md:inline-block">v1.0 · 2025</span>
        </motion.div>

        <div className="divider mb-8" />

        {/* Problem table */}
        <div className="bg-[#0A0B0D] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-0 px-5 py-2.5 bg-[#1A1D27] border-b border-[rgba(255,255,255,0.07)]">
            <div className="col-span-1 label">ID</div>
            <div className="col-span-1 label">Severity</div>
            <div className="col-span-3 label">Issue</div>
            <div className="col-span-5 label">Description</div>
            <div className="col-span-2 label">Affected Systems</div>
          </div>

          {/* Rows */}
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.35, delay: i * 0.1 }}
              className="grid grid-cols-12 gap-0 px-5 py-4 border-b border-[rgba(255,255,255,0.04)] trow"
            >
              <div className="col-span-1">
                <span className="mono text-[10px] text-[#4A5060]">{p.id}</span>
              </div>
              <div className="col-span-1">
                <span className={`tag ${SEV[p.severity]}`}>{p.severity}</span>
              </div>
              <div className="col-span-3 pr-4">
                <span className="text-[13px] font-medium text-[#E8E9EC]">{p.title}</span>
              </div>
              <div className="col-span-5 pr-6">
                <p className="text-[12px] text-[#8B909A] leading-relaxed">{p.description}</p>
              </div>
              <div className="col-span-2">
                <span className="mono text-[10px] text-[#4A5060] leading-tight">{p.affected}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 flex items-start gap-3 px-5 py-4 bg-[rgba(232,64,64,0.04)] border border-[rgba(232,64,64,0.12)] rounded-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#E84040] mt-1.5 flex-shrink-0" />
          <p className="text-[12px] text-[#8B909A] leading-relaxed">
            <strong className="text-[#E8E9EC]">Root cause:</strong> Monolithic LLM architectures conflate distinct 
            cognitive tasks — signal reading, plan construction, and risk evaluation — into a single inference call.
            Under market stress, this produces hallucinated confidence, missed risk flags, and unconstrained 
            position sizing. The failure is architectural, not model-level.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
