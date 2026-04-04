import { ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#0A0B0D] border-t border-[rgba(255,255,255,0.07)] px-6 py-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

        {/* Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 border border-[#00D4AA] flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-[#00D4AA]" />
          </div>
          <span className="mono text-[11px] font-semibold tracking-[0.12em] text-[#8B909A]">
            TRADEROOM<span className="text-[#00D4AA]">.AI</span>
          </span>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-5">
          {['Architecture', 'Pipeline', 'Stack', 'GitHub'].map((l) => (
            <a
              key={l}
              href={l === 'GitHub' ? 'https://github.com' : `#${l.toLowerCase()}`}
              target={l === 'GitHub' ? '_blank' : undefined}
              rel={l === 'GitHub' ? 'noopener noreferrer' : undefined}
              className="mono text-[10px] text-[#4A5060] hover:text-[#8B909A] uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              {l}
              {l === 'GitHub' && <ExternalLink className="w-2.5 h-2.5" />}
            </a>
          ))}
        </div>

        {/* Meta */}
        <div className="text-right">
          <p className="mono text-[10px] text-[#4A5060]">
            Built for HackByte · IITDM Jabalpur · 2025
          </p>
          <p className="mono text-[10px] text-[#4A5060] mt-0.5">
            Rust · SpaceTimeDB · Gemini · Mem0 · React
          </p>
        </div>
      </div>
    </footer>
  )
}
