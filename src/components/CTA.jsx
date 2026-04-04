import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

export default function CTA() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="py-20 px-6 bg-[#0F1117] border-t border-[rgba(255,255,255,0.07)]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
          >
            <p className="label mb-3">Project Status</p>
            <h2 className="text-[28px] font-bold tracking-tight text-[#E8E9EC] mb-4">
              Open-source reference implementation.
            </h2>
            <p className="text-[14px] text-[#8B909A] leading-relaxed mb-6 max-w-lg">
              TradeRoom.ai is a research and demonstration system. The codebase 
              implements the full three-agent pipeline described in this document —
              including SpaceTimeDB integration, Mem0 memory retrieval, and 
              role-scoped Gemini inference.
            </p>
            <p className="text-[12px] text-[#4A5060] leading-relaxed mb-8 max-w-lg border-l-2 border-[rgba(255,255,255,0.08)] pl-4">
              This system does not constitute financial advice and makes no return guarantees.
              Production deployment requires independent risk review, legal assessment, 
              and qualified human oversight on all execution decisions.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-primary">
                View on GitHub <ChevronRight className="w-3.5 h-3.5" />
              </a>
              <a href="#solution" className="btn-ghost">Architecture Docs</a>
            </div>
          </motion.div>

          {/* Right — capabilities checklist */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-[#0A0B0D] border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden"
          >
            <div className="px-5 py-3 bg-[#1A1D27] border-b border-[rgba(255,255,255,0.07)]">
              <span className="label">Implemented Capabilities</span>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {[
                { feature: 'Three-agent sequential swarm pipeline', status: 'Implemented' },
                { feature: 'SpaceTimeDB real-time shared state',    status: 'Implemented' },
                { feature: 'Gemini role-scoped inference',          status: 'Implemented' },
                { feature: 'Mem0 semantic memory retrieval',        status: 'Implemented' },
                { feature: 'CRO veto gate with reject logging',     status: 'Implemented' },
                { feature: 'React live operator dashboard',         status: 'Implemented' },
                { feature: 'Live market data ingestion',            status: 'Partial' },
                { feature: 'Execution routing (broker API)',        status: 'Planned' },
                { feature: 'Multi-asset parallel swarms',           status: 'Planned' },
              ].map(({ feature, status }) => (
                <div key={feature} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-[12px] text-[#8B909A]">{feature}</span>
                  <span
                    className={`mono text-[10px] uppercase tracking-wider ${
                      status === 'Implemented' ? 'text-[#00D4AA]'
                      : status === 'Partial'   ? 'text-[#F0A020]'
                      : 'text-[#4A5060]'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
