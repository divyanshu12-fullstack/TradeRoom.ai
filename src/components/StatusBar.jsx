import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const STATUSES = [
  { label: 'Swarm Engine',    status: 'OPERATIONAL', color: '#00D4AA' },
  { label: 'SpaceTimeDB',     status: 'OPERATIONAL', color: '#00D4AA' },
  { label: 'Data Firehose',   status: 'OPERATIONAL', color: '#00D4AA' },
  { label: 'Mem0 Memory',     status: 'OPERATIONAL', color: '#00D4AA' },
  { label: 'Risk Gate',       status: 'ACTIVE',       color: '#00D4AA' },
]

const METRICS = [
  { label: 'Swarm Cycle', value: '#2,847' },
  { label: 'State Sync',  value: '11ms'   },
  { label: 'CRO Latency', value: '887ms'  },
  { label: 'Uptime',      value: '99.97%' },
]

export default function StatusBar() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (d) =>
    d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="bg-[#0F1117] border-b border-[rgba(255,255,255,0.07)] px-6 py-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap"
    >
      {/* All systems */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="status-dot"
          style={{ background: '#00D4AA', boxShadow: '0 0 4px #00D4AA' }}
        />
        <span className="mono text-[10px] tracking-widest text-[#00D4AA] uppercase font-medium">
          All Systems Operational
        </span>
      </div>

      <div className="divider-v h-3 flex-shrink-0" />

      {/* Status chips */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {STATUSES.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="mono text-[10px] text-[#4A5060] uppercase tracking-wide">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="divider-v h-3 flex-shrink-0 ml-auto" />

      {/* Metrics */}
      <div className="flex items-center gap-5 flex-shrink-0">
        {METRICS.map((m) => (
          <div key={m.label} className="flex items-center gap-2">
            <span className="mono text-[10px] text-[#4A5060] uppercase">{m.label}:</span>
            <span className="mono text-[10px] text-[#8B909A] font-medium">{m.value}</span>
          </div>
        ))}
      </div>

      <div className="divider-v h-3 flex-shrink-0" />

      {/* UTC Clock */}
      <span className="mono text-[10px] text-[#4A5060] flex-shrink-0">
        UTC {fmt(time)}
      </span>
    </motion.div>
  )
}
