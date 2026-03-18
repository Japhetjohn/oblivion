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

function App() {
  const [view, setView] = useState<'landing' | 'mint'>('landing');

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

  if (view === 'mint') {
    return <MintPage onBack={() => setView('landing')} />;
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
