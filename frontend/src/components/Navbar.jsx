import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Architecture', href: '#solution' },
  { label: 'Pipeline', href: '#how-it-works' },
  { label: 'Stack', href: '#tech-stack' },
  { label: 'Docs', href: '#' },
];

export default function Navbar({ currentView, onViewDemo, onNavigateHome }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header
      className={`transition-colors duration-300 w-full ${scrolled
        ? 'bg-[#0A0B0D] border-b border-[rgba(255,255,255,0.07)]'
        : 'bg-[#0A0B0D]/80 backdrop-blur-sm border-b border-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-10 h-14 flex items-center justify-between">
        {/* Logo — minimal wordmark */}
        <a href="#" className="flex items-center gap-2.5 cursor-pointer" onClick={onNavigateHome}>
          <div className="w-5 h-5 border border-[#00D4AA] flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-[#00D4AA]" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-[0.08em] text-[#E8E9EC]">
            TRADEROOM<span className="text-[#00D4AA]">.AI</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-xs font-medium tracking-wide text-[#8B909A] hover:text-[#E8E9EC] transition-colors uppercase"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={onViewDemo} className="btn-ghost text-xs">
            {currentView === 'demo' ? 'Back to Landing' : 'View Demo'}
          </button>
          <a href="#" className="btn-primary text-xs">
            Request Access <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Mobile */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-[#8B909A] hover:text-white"
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-[#0F1117] border-b border-[rgba(255,255,255,0.07)]"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-xs font-mono tracking-widest text-[#8B909A] hover:text-white uppercase py-2 border-b border-[rgba(255,255,255,0.04)]"
                >
                  {l.label}
                </a>
              ))}
              <a href="#" className="btn-primary mt-2 justify-center text-xs">Request Access</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
