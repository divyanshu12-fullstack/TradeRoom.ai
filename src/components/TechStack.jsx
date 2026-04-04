import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const TECH = [
  {
    layer: 'Core Engine',
    component: 'Rust + SpaceTimeDB',
    version: 'STDB 1.0',
    role: 'Shared state synchronisation and orchestration scheduling for all agents.',
    why: 'Eliminates inter-service latency by keeping shared state co-located with computation. Agents read the same table version with sub-millisecond consistency.',
    alternatives: 'Redis Pub/Sub, Kafka',
    tradeoff: 'Requires Rust for server-side logic; no REST fallback.',
  },
  {
    layer: 'AI Reasoning',
    component: 'Google Gemini API',
    version: 'gemini-1.5-pro',
    role: 'Role-scoped inference calls for QUANT, PM, and CRO agents.',
    why: 'Each agent uses a distinct system prompt scoped to its domain. Structured JSON output mode enforces schema compliance on every response.',
    alternatives: 'GPT-4o, Claude 3.5',
    tradeoff: 'Latency varies 150–450ms per call. Cached via Mem0 for recurring scenarios.',
  },
  {
    layer: 'Persistent Memory',
    component: 'Mem0 API',
    version: 'v1.1',
    role: 'Semantic memory storage and retrieval for cross-session agent learning.',
    why: 'Vector search over prior decisions lets agents retrieve structurally similar past situations without full context windows. Rejection history prevents repeated failed setups.',
    alternatives: 'Pinecone, Weaviate, PGVector',
    tradeoff: 'External API dependency. Failed retrieval degrades to zero-shot reasoning.',
  },
  {
    layer: 'Frontend',
    component: 'React + Vite',
    version: 'React 18 · Vite 5',
    role: 'Live dashboard for agent reasoning, risk flags, and decision audit trail.',
    why: 'SpaceTimeDB SDK provides a client subscription model. Table updates push to UI in real time — no polling, no websocket middleware.',
    alternatives: 'Next.js, SvelteKit',
    tradeoff: 'SPA routing; SSR not required for internal operator dashboard use case.',
  },
]

const COMPARISON = [
  { scenario: 'Mixed signal conditions',      single: 'Single prompt handling all domains simultaneously',     swarm: 'Quant isolates signal; PM plans; CRO challenges independently' },
  { scenario: 'Contradictory market evidence', single: 'Ambiguity averaged into weak conviction output',         swarm: 'CRO explicitly flags logical conflicts; can issue REJECT' },
  { scenario: 'Repeated failure patterns',     single: 'No cross-session recall; same mistake re-occurs',        swarm: 'Mem0 retrieval injects prior failure context at inference time' },
  { scenario: 'Overconfident sizing',          single: 'No internal challenge; high-confidence = large position', swarm: 'CRO independently checks size against portfolio exposure limits' },
]

export default function TechStack() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="tech-stack" ref={ref} className="py-20 px-6 bg-[#0A0B0D] border-t border-[rgba(255,255,255,0.07)]">
      <div className="max-w-7xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p className="label mb-2">Technology Stack</p>
          <h2 className="text-[28px] font-bold tracking-tight text-[#E8E9EC]">
            Component selection rationale
          </h2>
        </motion.div>

        <div className="divider mb-8" />

        {/* Tech table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden mb-8"
        >
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 px-5 py-2.5 bg-[#1A1D27] border-b border-[rgba(255,255,255,0.07)]">
            <div className="col-span-2 label">Layer</div>
            <div className="col-span-2 label">Component</div>
            <div className="col-span-3 label">Selection Rationale</div>
            <div className="col-span-3 label">vs. Alternatives</div>
            <div className="col-span-2 label">Trade-offs</div>
          </div>

          {TECH.map((t, i) => (
            <motion.div
              key={t.layer}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.07 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-0 px-5 py-4 border-b border-[rgba(255,255,255,0.04)] trow"
            >
              <div className="md:col-span-2">
                <span className="label">{t.layer}</span>
              </div>
              <div className="md:col-span-2">
                <p className="text-[12px] font-semibold text-[#E8E9EC]">{t.component}</p>
                <p className="mono text-[10px] text-[#4A5060]">{t.version}</p>
              </div>
              <div className="md:col-span-3 pr-4">
                <p className="text-[11px] text-[#8B909A] leading-relaxed">{t.why}</p>
              </div>
              <div className="md:col-span-3 pr-4">
                <span className="mono text-[10px] text-[#4A5060]">{t.alternatives}</span>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] text-[#4A5060] leading-relaxed italic">{t.tradeoff}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-[#0F1117] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] bg-[#1A1D27] flex items-center justify-between">
            <span className="label">Single LLM vs. Multi-Agent Swarm — Scenario Analysis</span>
          </div>
          <div className="hidden md:grid grid-cols-12 px-5 py-2 border-b border-[rgba(255,255,255,0.05)]">
            <div className="col-span-3 label">Scenario</div>
            <div className="col-span-4 label">Single-Agent LLM</div>
            <div className="col-span-5 label text-[#00D4AA]">TradeRoom.ai Swarm ✦</div>
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-0 px-5 py-3 border-b border-[rgba(255,255,255,0.04)] trow"
            >
              <div className="md:col-span-3 pr-4">
                <span className="text-[12px] font-medium text-[#E8E9EC]">{row.scenario}</span>
              </div>
              <div className="md:col-span-4 pr-6">
                <span className="text-[11px] text-[#4A5060]">{row.single}</span>
              </div>
              <div className="md:col-span-5">
                <span className="text-[11px] text-[#8B909A]">{row.swarm}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
