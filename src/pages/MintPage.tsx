import { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, Shield, Zap, Globe } from 'lucide-react';
import { tourScheduleConfig } from '../config';

interface MintPageProps {
  onBack: () => void;
}

const MintPage = ({ onBack }: MintPageProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mintCount, setMintCount] = useState(1);

  // Auto-connect if redirected or already in Phantom browser
  useEffect(() => {
    const handleAutoConnect = async () => {
      const params = new URLSearchParams(window.location.search);
      const shouldConnect = params.get('connect') === 'true';
      const provider = (window as any).solana;

      if ((shouldConnect || provider?.isPhantom) && !walletAddress) {
        try {
          setIsConnecting(true);
          const resp = await provider.connect();
          setWalletAddress(resp.publicKey.toString());
        } catch (err) {
          console.error('Connection failed:', err);
        } finally {
          setIsConnecting(false);
        }
      }
    };

    handleAutoConnect();
  }, [walletAddress]);

  // Deep Link Logic for Phantom Mobile
  const connectWallet = async () => {
    const provider = (window as any).solana;

    // 1. If provider exists (we're in Phantom browser), connect directly
    if (provider?.isPhantom) {
      try {
        setIsConnecting(true);
        const resp = await provider.connect();
        setWalletAddress(resp.publicKey.toString());
      } catch (err) {
        console.error(err);
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    // 2. If on mobile and no provider, deep link to Phantom Browser
    const isMobile = /iPhone|iPad|iObject|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const currentUrl = window.location.href;
      // Append connect=true if not already present
      const joiner = currentUrl.includes('?') ? '&' : '?';
      const redirectUrl = encodeURIComponent(`${currentUrl}${currentUrl.includes('connect=true') ? '' : joiner + 'connect=true'}`);
      const phantomLink = `https://phantom.app/ul/browse/${redirectUrl}?ref=${encodeURIComponent(window.location.origin)}`;
      window.location.href = phantomLink;
      return;
    }

    // 3. Desktop fallback (Mock for now, or real if extension exists)
    setIsConnecting(true);
    setTimeout(() => {
      setWalletAddress('8xJ...z9P');
      setIsConnecting(false);
    }, 1500);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 3)}...${addr.slice(-3)}`;
  };

  const activeNFT = tourScheduleConfig.tourDates[0]; // Assuming first is the active one for now

  return (
    <div className="min-h-screen bg-void-black text-white font-sans selection:bg-neon-cyan/30">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void-black/80 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono-custom text-sm uppercase tracking-wider">Back</span>
        </button>

        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-display text-sm uppercase tracking-wider transition-all duration-300 ${
            walletAddress 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-neon-cyan text-void-black hover:bg-neon-cyan/80 shadow-[0_0_20px_rgba(0,212,255,0.3)]'
          }`}
        >
          {isConnecting ? (
            <div className="w-4 h-4 border-2 border-void-black/30 border-t-void-black animate-spin rounded-full" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          <span>{walletAddress ? formatAddress(walletAddress) : 'Connect Wallet'}</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: NFT Preview */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-neon-cyan/20 to-neon-soft/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img 
                src={activeNFT.image} 
                alt="Active NFT" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void-black via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-6 left-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-neon-cyan/20 text-neon-cyan text-[10px] font-bold rounded-full border border-neon-cyan/30 uppercase tracking-widest">
                    LIVE NOW
                  </span>
                </div>
                <h1 className="font-display text-4xl text-white">GENESIS #001</h1>
              </div>
            </div>
          </div>

          {/* Right: Minting Details */}
          <div className="space-y-8">
            <div>
              <p className="font-mono-custom text-neon-soft/60 uppercase tracking-[0.3em] mb-4">Forgotten Realms</p>
              <h2 className="font-display text-5xl md:text-6xl text-white leading-tight mb-6">
                Enter the <span className="text-neon-cyan">Oblivion</span>
              </h2>
              <p className="text-white/60 leading-relaxed text-lg">
                The Genesis Collection marks the first descent into the Forgotten Realms. 
                Each NFT serves as a key to future drops, governance rights, and exclusive community events.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Price</p>
                <p className="font-display text-2xl text-white">0.5 SOL</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Remaining</p>
                <p className="font-display text-2xl text-white">742 / 1000</p>
              </div>
            </div>

            {/* Mint Form */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-sm text-white/80">Quantity</span>
                <div className="flex items-center gap-6 bg-void-black/50 rounded-full border border-white/10 px-4 py-2">
                  <button 
                    onClick={() => setMintCount(Math.max(1, mintCount - 1))}
                    className="text-white/40 hover:text-white transition-colors"
                  >-</button>
                  <span className="font-display text-xl w-6 text-center">{mintCount}</span>
                  <button 
                    onClick={() => setMintCount(Math.min(5, mintCount + 1))}
                    className="text-white/40 hover:text-white transition-colors"
                  >+</button>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex justify-between items-center">
                <span className="font-mono-custom text-sm text-white/80">Total</span>
                <span className="font-display text-2xl text-neon-cyan">{ (mintCount * 0.5).toFixed(1) } SOL</span>
              </div>

              <button 
                onClick={() => !walletAddress ? connectWallet() : alert('Minting coming soon!')}
                className="w-full py-4 bg-neon-cyan text-void-black font-display text-lg uppercase tracking-wider rounded-xl hover:bg-neon-cyan/80 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(0,212,255,0.2)]"
              >
                {walletAddress ? 'MINT NOW' : 'CONNECT WALLET TO MINT'}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-8 items-center text-white/40">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-mono-custom">Verified Smart Contract</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-mono-custom">Instant Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-mono-custom">Solana Network</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative background grid */}
      <div className="fixed inset-0 z-[-1] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-void-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>
    </div>
  );
};

export default MintPage;
