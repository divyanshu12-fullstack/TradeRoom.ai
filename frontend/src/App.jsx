import { useState } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Problem from './components/Problem';
import Solution from './components/Solution';
import HowItWorks from './components/HowItWorks';
import TechStack from './components/TechStack';
import CTA from './components/CTA';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'demo'

  const handleViewDemo = () => {
    setCurrentView(v => v === 'demo' ? 'landing' : 'demo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = (e) => {
    e.preventDefault();
    if (currentView === 'demo') {
      setCurrentView('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0A0B0D', color: '#E8E9EC' }}>
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        <Navbar
          currentView={currentView}
          onViewDemo={handleViewDemo}
          onNavigateHome={handleNavigateHome}
        />
      </div>

      {currentView === 'landing' ? (
        <main className="pt-[88px]">
          <Hero onViewDemo={handleViewDemo} />
          <Problem />
          <Solution />
          <HowItWorks />
          <TechStack />
          <CTA onViewDemo={handleViewDemo} />
          <Footer />
        </main>
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
