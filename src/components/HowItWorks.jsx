import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const STEPS = [
  {
    id: '01',
    phase: 'Ingestion',
    title: 'Data Firehose',
    description: 'Node.js poller fetches market ticks from Binance/Alpaca WebSocket feeds. Writes normalised OHLCV and indicator data into SpaceTimeDB tables at configurable cadence.',
    inputs: ['Binance WS', 'Alpaca Feed'],
    outputs: ['SpaceTimeDB: market_state', 'SpaceTimeDB: indicators'],
    latency: '~8ms write',
  },
  {
    id: '02',
    phase: 'Reasoning — Quant',
    title: 'Signal Analysis',
    description: 'Rust scheduler wakes QUANT agent. Reads latest market tables, retrieves semantically similar past situations from Mem0, invokes Gemini with signal-scoped prompt.',
    inputs: ['market_state', 'mem0_recall'],
    outputs: ['agent_messages', 'structured_memory'],
    latency: '~312ms',
  },
  {
    id: '03',
    phase: 'Reasoning — PM',
    title: 'Plan Construction',
    description: 'PM agent reads QUANT output from agent_messages table. Constructs position sizing, entry/exit targets, and execution intent. Writes structured plan to shared state.',
    inputs: ['QUANT.thesis', 'portfolio_state'],
    outputs: ['trade_plan', 'decision_log'],
    latency: '~245ms',
  },
  {
    id: '04',
    phase: 'Reasoning — CRO',
    title: 'Risk Gate',
    description: 'CRO reads PM plan and portfolio exposure. Challenges assumptions, checks risk thresholds, queries Mem0 for prior rejections. REJECT verdict halts execution unconditionally.',
    inputs: ['trade_plan', 'exposure_state', 'mem0_reject_history'],
    outputs: ['verdict: EXECUTE | REJECT', 'risk_flags[]', 'mem0_write'],
    latency: '~330ms',
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" ref={ref} className="py-20 px-6 bg-[#0F1117] border-t border-[rgba(255,255,255,0.07)]">
      <div className="max-w-7xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p className="label mb-2">Execution Pipeline</p>
          <h2 className="text-[28px] font-bold tracking-tight text-[#E8E9EC]">
            Swarm cycle: sequential, deterministic, bounded
          </h2>
        </motion.div>

        <div className="divider mb-10" />

        {/* Horizontal pipeline diagram */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          {/* Top connector rail */}
          <div className="hidden lg:block absolute top-[44px] left-0 right-0 h-px bg-[rgba(255,255,255,0.07)] z-0" />

          {/* Step cards — horizontal flow */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative z-10">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                className="flex flex-col"
              >
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-[52px] h-[52px] flex-shrink-0 bg-[#1A1D27] border border-[rgba(255,255,255,0.09)] flex items-center justify-center">
                    <span className="mono text-[13px] font-semibold text-[#00D4AA]">{step.id}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block h-px flex-1 bg-[rgba(255,255,255,0.07)]" />
                  )}
                </div>

                {/* Card body */}
                <div className="bg-[#0A0B0D] border border-[rgba(255,255,255,0.07)] rounded-sm flex flex-col flex-1">
                  <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
                    <p className="mono text-[9px] text-[#4A5060] uppercase tracking-widest mb-1">{step.phase}</p>
                    <p className="text-[13px] font-semibold text-[#E8E9EC]">{step.title}</p>
                  </div>

                  <div className="px-4 py-3 flex-1">
                    <p className="text-[11px] text-[#8B909A] leading-relaxed mb-4">{step.description}</p>

                    <div className="space-y-2.5">
                      <div>
                        <p className="mono text-[9px] text-[#4A5060] uppercase tracking-wider mb-1.5">Reads</p>
                        <div className="flex flex-wrap gap-1">
                          {step.inputs.map((inp) => (
                            <span key={inp} className="tag">{inp}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mono text-[9px] text-[#4A5060] uppercase tracking-wider mb-1.5">Writes</p>
                        <div className="flex flex-wrap gap-1">
                          {step.outputs.map((out) => (
                            <span key={out} className="tag tag-accent">{out}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                    <span className="mono text-[9px] text-[#4A5060] uppercase">Latency</span>
                    <span className="mono text-[10px] text-[#8B909A]">{step.latency}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Total latency summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-8 bg-[#0A0B0D] border border-[rgba(255,255,255,0.07)] rounded-sm px-5 py-4"
        >
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="mono text-[9px] text-[#4A5060] uppercase tracking-wider mb-1">Total Cycle Time</p>
              <p className="mono text-[20px] font-semibold text-[#E8E9EC] tabular-nums">
                ~887<span className="text-[13px] text-[#8B909A] ml-1">ms end-to-end</span>
              </p>
            </div>
            <div className="divider-v h-8" />
            <div>
              <p className="mono text-[9px] text-[#4A5060] uppercase tracking-wider mb-1">State Reads</p>
              <p className="mono text-[20px] font-semibold text-[#E8E9EC] tabular-nums">
                &lt;12<span className="text-[13px] text-[#8B909A] ml-1">ms cold-read SpaceTimeDB</span>
              </p>
            </div>
            <div className="divider-v h-8" />
            <div>
              <p className="mono text-[9px] text-[#4A5060] uppercase tracking-wider mb-1">Execution Gate</p>
              <p className="mono text-[13px] font-semibold text-[#00D4AA]">CRO APPROVE required · No bypass path</p>
            </div>
            <div className="ml-auto hidden md:block">
              <span className="tag-accent tag text-[11px]">Deterministic execution order guaranteed</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
