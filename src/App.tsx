import { useEffect, useState } from 'react';
import './index.css';
import useLenis from './hooks/useLenis';
import { siteConfig } from './config';
import Hero from './sections/Hero';
import AlbumCube from './sections/AlbumCube';
import ParallaxGallery from './sections/ParallaxGallery';
import TourSchedule from './sections/TourSchedule';
import Footer from './sections/Footer';
import MintPage from './pages/MintPage';
import { MonitorOff, Smartphone, ExternalLink } from 'lucide-react';

function App() {
  const [view, setView] = useState<'landing' | 'mint'>('landing');
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      // Check both UA and screen width for robust mobile detection
      const userAgent = navigator.userAgent || (window as any).vendor || (window as any).opera;
      const mobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const mobileWidth = window.innerWidth <= 1024; // Include tablets/small laptops as mobile-friendly limit
      setIsMobile(mobileUA || mobileWidth);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Lenis smooth scrolling only on landing
  useLenis();

  useEffect(() => {
    // Set page title from config
    if (siteConfig.title) {
      document.title = siteConfig.title;
    }

    // Add viewport meta for better mobile experience
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }, []);

  const [isMountingMint, setIsMountingMint] = useState(false);

  useEffect(() => {
    if (view === 'mint') {
      // Reset scroll position and delay mounting to allow GPU to breathe
      window.scrollTo(0, 0);
      const timer = setTimeout(() => setIsMountingMint(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsMountingMint(false);
    }
  }, [view]);

  if (view === 'mint' && isMountingMint) {
    return <MintPage onBack={() => {
      setIsMountingMint(false);
      setView('landing');
    }} />;
  }

  // Loading state during transition
  if (view === 'mint' && !isMountingMint) {
    return (
      <div className="fixed inset-0 bg-void-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin" />
      </div>
    );
  }

  // Mobile Only Restriction Overlay
  if (isMobile === false) {
    return (
      <div className="fixed inset-0 z-[1000] bg-void-black flex flex-col items-center justify-center p-10 text-center overflow-hidden">
        {/* Background Grid Accent */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-void-black [mask-image:radial-gradient(ellipse_at_center,transparent_0%,black)]" />
        </div>

        <div className="relative z-10 max-w-lg space-y-12 animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block">
            <div className="absolute -inset-8 bg-neon-cyan/20 rounded-full blur-3xl animate-pulse" />
            <div className="relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
              <MonitorOff className="w-24 h-24 text-neon-cyan" />
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="font-display text-5xl md:text-6xl text-white uppercase tracking-tighter leading-none">
              Mobile Only <span className="text-neon-cyan">Access</span>
            </h1>
            <p className="text-white/60 font-mono-custom text-sm leading-relaxed uppercase tracking-[0.25em] max-w-sm mx-auto">
              The Oblivion protocols are strictly optimized for mobile access only. 
              Please scan or visit this URL on your smartphone.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center gap-6 shadow-2xl">
            <div className="bg-white p-5 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform duration-500">
               {/* Simplified QR Placeholder */}
               <div className="w-32 h-32 bg-void-black rounded-xl flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-transparent opacity-50" />
                 <Smartphone className="w-16 h-16 text-white opacity-20" />
               </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] text-neon-cyan font-bold uppercase tracking-[0.5em] animate-pulse">Scanning Enabled</p>
              <div className="flex items-center gap-2 px-4 py-2 bg-void-black/50 rounded-full border border-white/10">
                <Smartphone className="w-3 h-3 text-white/60" />
                <span className="text-[10px] text-white/60 font-mono-custom uppercase tracking-widest">{window.location.hostname}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 mx-auto text-white/40 hover:text-white transition-colors text-[10px] font-mono-custom uppercase tracking-[0.3em] group"
          >
            <span>System Refresh</span>
            <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="relative w-full min-h-screen bg-void-black overflow-x-hidden">
      {/* Hero Section - Immersive landing */}
      <Hero />

      {/* Album Cube Section - 3D showcase */}
      <AlbumCube />

      {/* Parallax Gallery Section */}
      <ParallaxGallery />

      {/* Tour Schedule Section */}
      <TourSchedule onMintClick={() => setView('mint')} />

      {/* Footer Section */}
      <Footer />
    </main>
  );
}

export default App;
