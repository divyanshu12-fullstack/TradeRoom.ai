import './index.css'
import Navbar from './components/Navbar'
import StatusBar from './components/StatusBar'
import Hero from './components/Hero'
import Problem from './components/Problem'
import Solution from './components/Solution'
import HowItWorks from './components/HowItWorks'
import TechStack from './components/TechStack'
import CTA from './components/CTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0B0D', color: '#E8E9EC' }}>
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        <StatusBar />
        <Navbar />
      </div>
      <main className="pt-[88px]">
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <TechStack />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
