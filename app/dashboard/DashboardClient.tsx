"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
  useBlockNumber,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits, parseAbi, parseUnits } from "viem";
import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS, FAUCET_ADDRESS } from "@/lib/constants";

// --- ABI Definitions ---
const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
]);

const erc721Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

const stakingAbi = parseAbi([
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claim()",
  "function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)",
  "function pendingRewards(address) view returns (uint256)",
]);

const faucetAbi = parseAbi(["function requestTokens()"]);

// --- Utility Components ---
function shortAddr(a?: string) {
  if (!a) return "-";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const EXPLORER_URL = "https://explorer.testnet.chain.robinhood.com/address";

function ExplorerLink({ address, label }: { address: string; label: string }) {
  return (
    <a
      href={`${EXPLORER_URL}/${address}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[10px] font-mono text-white/50 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-emerald-300"
    >
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
      {label}: {shortAddr(address)}
      <svg className="h-3 w-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </a>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-[#0a0f15]/80 backdrop-blur-md ring-1 ring-white/10 px-5 py-5 shadow-xl", className)}>
      <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      <div className="text-sm font-semibold text-white/80 uppercase tracking-wider">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Button({ children, onClick, disabled, variant = "primary", className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "outline"; className?: string; }) {
  const base = "relative inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";
  const v =
    variant === "primary" ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
      : variant === "secondary" ? "bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-white/10"
      : "bg-transparent text-emerald-400 ring-1 ring-emerald-500/40 hover:bg-emerald-500/10";
  return (
    <button className={cn(base, v, className)} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// --- Main Dashboard ---
export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [amount, setAmount] = useState("0.0");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const bn = useBlockNumber({ watch: true });

  // Reads
  const decimals = useReadContract({ abi: erc20Abi, address: TOKEN_ADDRESS, functionName: "decimals", query: { enabled: !!address } });
  const tokenBalance = useReadContract({ abi: erc20Abi, address: TOKEN_ADDRESS, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const allowance = useReadContract({ abi: erc20Abi, address: TOKEN_ADDRESS, functionName: "allowance", args: address ? [address, STAKING_ADDRESS] : undefined, query: { enabled: !!address } });
  const nftBalance = useReadContract({ abi: erc721Abi, address: NFT_ADDRESS, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const userInfo = useReadContract({ abi: stakingAbi, address: STAKING_ADDRESS, functionName: "userInfo", args: address ? [address] : undefined, query: { enabled: !!address } });
  const pendingRewards = useReadContract({ abi: stakingAbi, address: STAKING_ADDRESS, functionName: "pendingRewards", args: address ? [address] : undefined, query: { enabled: !!address } });

  const dec = Number(decimals.data ?? 18);
  const parsedAmount = useMemo(() => {
    try { return amount ? parseUnits(amount, dec) : BigInt(0); } catch { return BigInt(0); }
  }, [amount, dec]);

  // Data Formatting & Safety Checks
  const tokenBalFmt = typeof tokenBalance.data === "bigint" ? formatUnits(tokenBalance.data, dec) : "0";
  
  const allowanceFmt = useMemo(() => {
    if (typeof allowance.data !== "bigint") return "0";
    if (allowance.data > parseUnits("1000000000", dec)) return "Unlimited";
    return formatUnits(allowance.data, dec);
  }, [allowance.data, dec]);

  const nftBalFmt = typeof nftBalance.data === "bigint" ? nftBalance.data.toString() : "0";
  
  const stakedRaw = useMemo(() => {
    if (!userInfo.data) return BigInt(0);
    const data = userInfo.data as any;
    return BigInt(data.amount ?? data.stakedAmount ?? data[0] ?? (typeof data === "bigint" ? data : 0));
  }, [userInfo.data]);

  const stakedFmt = typeof stakedRaw === "bigint" ? formatUnits(stakedRaw, dec) : "0";
  const pendingFmt = typeof pendingRewards.data === "bigint" ? formatUnits(pendingRewards.data, dec) : "0";

  // Writes
  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const tx = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (tx.isSuccess) {
      toast.success("Transaction Confirmed! ✅", { id: "tx" });
      setActiveAction(null);
      tokenBalance.refetch();
      allowance.refetch();
      userInfo.refetch();
      pendingRewards.refetch();
    }
    if (tx.isError) {
      toast.error("Transaction Failed! ❌", { id: "tx" });
      setActiveAction(null);
    }
  }, [tx.isSuccess, tx.isError]);

  const maxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  const canApprove = useMemo(() => {
    if (!isConnected || typeof allowance.data !== "bigint") return false;
    return allowance.data < parsedAmount;
  }, [isConnected, allowance.data, parsedAmount]);

  // Handlers
  function handleMaxStake() { setAmount(tokenBalFmt); }
  function handleMaxUnstake() { setAmount(stakedFmt); }

  function handleAction(actionName: string, config: any) {
    if (!isConnected) return toast.error("Connect wallet dulu ngab!");
    if (actionName !== "Claim" && actionName !== "Faucet" && actionName !== "Approve" && parsedAmount <= BigInt(0)) {
      return toast.error("Amount harus lebih dari 0!");
    }

    setActiveAction(actionName);
    toast.loading(`Processing ${actionName}...`, { id: "tx" });

    writeContract(config, {
      onError: (err) => {
        console.error(`${actionName} Error:`, err);
        toast.error(`Failed: ${err.message?.split("\n")[0].slice(0, 40)}`, { id: "tx" });
        setActiveAction(null);
      },
      onSuccess: () => {
        toast.loading(`Confirming ${actionName} on-chain...`, { id: "tx" });
      }
    });
  }

  const doApprove = () => handleAction("Approve", { abi: erc20Abi, address: TOKEN_ADDRESS, functionName: "approve", args: [STAKING_ADDRESS, maxUint256] });
  const doStake = () => handleAction("Stake", { abi: stakingAbi, address: STAKING_ADDRESS, functionName: "stake", args: [parsedAmount] });
  const doUnstake = () => handleAction("Unstake", { abi: stakingAbi, address: STAKING_ADDRESS, functionName: "unstake", args: [parsedAmount] });
  const doClaim = () => handleAction("Claim", { abi: stakingAbi, address: STAKING_ADDRESS, functionName: "claim", args: [] });
  const doFaucet = () => handleAction("Faucet", { abi: faucetAbi, address: FAUCET_ADDRESS, functionName: "requestTokens", args: [] });

  const busy = isConnecting || isWriting || tx.isLoading || activeAction !== null;

  return (
    <div className="min-h-screen bg-[#040609] text-white selection:bg-emerald-500/30">
      {/* Background Cyber Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[700px] w-[700px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-sky-500/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-black ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <img src="/robinhood.png" alt="Logo" className="relative z-10 h-10 w-10 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white/90">
                  ROBINHOOD <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">STAKING</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Testnet Live
                  </div>
                  <span className="text-xs text-white/40 font-mono">Block: {bn.data?.toString() ?? "Syncing..."}</span>
                </div>
              </div>
            </div>

            {/* Smart Contract Quick Links (Explorer) */}
            <div className="mt-5 flex flex-wrap gap-2">
               <ExplorerLink address={TOKEN_ADDRESS} label="KRM" />
               <ExplorerLink address={NFT_ADDRESS} label="NFT" />
               <ExplorerLink address={STAKING_ADDRESS} label="STAKE" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="https://x.com/KarimKusin" target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white" aria-label="X/Twitter">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            
            <a href="https://faucet.testnet.chain.robinhood.com" target="_blank" rel="noreferrer" className="flex h-10 items-center rounded-xl bg-white/5 px-4 text-xs font-semibold text-white/70 ring-1 ring-white/10 transition hover:bg-white/10">
              ⛽ Global
            </a>

            {isConnected && (
               <button onClick={doFaucet} disabled={busy} className="flex h-10 items-center rounded-xl bg-emerald-500/10 px-4 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/20 disabled:opacity-50">
                 {activeAction === "Faucet" ? "Tx Pending..." : "💧 KRM Faucet"}
               </button>
            )}

            {isConnected ? (
              <div className="flex items-center gap-2 ml-2">
                <span className="rounded-xl bg-white/5 px-4 py-2 text-sm font-mono text-white/80 ring-1 ring-white/10">{shortAddr(address)}</span>
                <button onClick={() => disconnect()} disabled={busy} className="rounded-xl bg-red-500/10 p-2.5 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            ) : (
              <Button onClick={() => connect({ connector: injected() })} disabled={busy} className="h-10 ml-2">
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card title="Wallet Overview">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1">KRM Balance</div>
                  <div className="font-mono text-2xl font-light text-white">{tokenBalFmt}</div>
                </div>
                <div className="h-[1px] w-full bg-white/5" />
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1">NFT Booster</div>
                    <div className="font-mono text-lg text-emerald-300">{nftBalFmt}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1">Allowance</div>
                    <div className="font-mono text-sm text-white/50">{allowanceFmt}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Staking Position">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1">Total Staked</div>
                  <div className="font-mono text-2xl font-light text-sky-300">{stakedFmt} <span className="text-sm text-sky-300/50">KRM</span></div>
                </div>
                <div className="h-[1px] w-full bg-white/5" />
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[11px] font-medium text-emerald-400/50 uppercase tracking-wider mb-1">Pending Rewards</div>
                    <div className="font-mono text-xl text-emerald-400">{pendingFmt}</div>
                  </div>
                  <Button variant="outline" className="px-3 py-1.5 text-xs h-8" onClick={doClaim} disabled={!isConnected || busy || pendingFmt === "0" || pendingFmt === "0.0"}>
                    {activeAction === "Claim" ? "..." : "Claim"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <Card title="Protocol Actions" className="lg:col-span-1 bg-gradient-to-b from-[#0a0f15] to-[#06110d] ring-emerald-500/20">
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Amount (KRM)</span>
                  <div className="flex gap-2">
                    <button onClick={handleMaxStake} className="text-[10px] font-bold text-emerald-400/70 hover:text-emerald-300 uppercase tracking-wider transition">Max Stake</button>
                    <span className="text-white/20 text-[10px]">|</span>
                    <button onClick={handleMaxUnstake} className="text-[10px] font-bold text-sky-400/70 hover:text-sky-300 uppercase tracking-wider transition">Max Unstake</button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl bg-black/50 ring-1 ring-white/10 px-4 py-3.5 text-lg outline-none focus:ring-emerald-500/50 transition-all font-mono text-white placeholder-white/20"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30 pointer-events-none">KRM</div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {canApprove ? (
                   <Button onClick={doApprove} disabled={!isConnected || busy} className="w-full py-3.5 text-sm">
                     {activeAction === "Approve" ? "Authorizing..." : "Authorize KRM"}
                   </Button>
                ) : (
                   <Button onClick={doStake} disabled={!isConnected || busy || parsedAmount <= BigInt(0)} className="w-full py-3.5 text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                     {activeAction === "Stake" ? "Executing Stake..." : "Stake KRM"}
                   </Button>
                )}

                <Button variant="secondary" onClick={doUnstake} disabled={!isConnected || busy || parsedAmount <= BigInt(0)} className="w-full py-3">
                  {activeAction === "Unstake" ? "Processing..." : "Unstake Position"}
                </Button>
              </div>
            </div>
          </Card>

        </div>
        
        {/* Footer */}
        <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-6 text-[11px] font-mono text-white/30">
            <div>DEVELOPED BY <span className="text-emerald-400/70">KARIMKUSIN88</span></div>
            <div>SYSTEM: ONLINE</div>
        </div>

      </div>
    </div>
  );
}
