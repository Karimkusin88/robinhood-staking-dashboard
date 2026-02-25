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
// ⚠️ Jangan lupa import FAUCET_ADDRESS di file constants lu
import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS, FAUCET_ADDRESS } from "@/lib/constants";

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
  "function userInfo(address) view returns (uint256 stakedAmount, uint256 rewardDebt)",
  "function pendingRewards(address) view returns (uint256)",
]);

// Tambahan ABI buat Faucet
const faucetAbi = parseAbi([
  "function requestTokens()"
]);

function shortAddr(a?: string) {
  if (!a) return "-";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]", className)}>
      <div className="text-sm font-semibold text-white/85">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Badge({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "blue" | "zinc" | "amber" }) {
  const toneClass =
    tone === "emerald" ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20"
      : tone === "blue" ? "bg-sky-400/10 text-sky-200 ring-sky-300/20"
      : tone === "amber" ? "bg-amber-400/10 text-amber-200 ring-amber-300/20"
      : "bg-white/5 text-white/70 ring-white/10";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1", toneClass)}>
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "primary", className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "outline"; className?: string; }) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const v =
    variant === "primary" ? "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/20 hover:bg-emerald-400/20"
      : variant === "secondary" ? "bg-white/6 text-white/80 ring-1 ring-white/10 hover:bg-white/10"
      : "bg-transparent text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-400/10";
  return (
    <button className={cn(base, v, className)} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function GlowLogo() {
  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-2xl ring-1 ring-emerald-400/25">
      <div className="absolute inset-0 rounded-2xl bg-emerald-400/25 blur-md" />
      <img src="/robinhood.png" alt="Robinhood" className="relative h-full w-full object-cover" />
    </div>
  );
}

export default function DashboardClient() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [amount, setAmount] = useState("0.0");
  const [showHelp, setShowHelp] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const bn = useBlockNumber({ watch: true });

  // ---------------------------------------------------------------------------
  // READ CONTRACTS
  // ---------------------------------------------------------------------------
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

  // Formatted Data
  const tokenBalFmt = typeof tokenBalance.data === "bigint" ? formatUnits(tokenBalance.data, dec) : "0";
  const allowanceFmt = typeof allowance.data === "bigint" ? formatUnits(allowance.data, dec) : "0";
  const nftBalFmt = typeof nftBalance.data === "bigint" ? nftBalance.data.toString() : "0";
  
  const stakedRaw = userInfo.data ? (Array.isArray(userInfo.data) ? userInfo.data[0] : (userInfo.data as any).stakedAmount) : BigInt(0);
  const stakedFmt = typeof stakedRaw === "bigint" ? formatUnits(stakedRaw, dec) : "0";
  const pendingFmt = typeof pendingRewards.data === "bigint" ? formatUnits(pendingRewards.data, dec) : "0";

  // ---------------------------------------------------------------------------
  // WRITE CONTRACTS & TX TRACKING
  // ---------------------------------------------------------------------------
  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const tx = useWaitForTransactionReceipt({ hash: txHash });

  // Reset loading state and refresh data when tx success
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

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  function handleMaxStake() { setAmount(tokenBalFmt); }
  function handleMaxUnstake() { setAmount(stakedFmt); }

  function handleAction(actionName: string, config: any) {
    if (!isConnected) return toast.error("Connect wallet dulu ngab!");
    if (actionName !== "Claim" && actionName !== "Faucet" && actionName !== "Approve" && parsedAmount <= BigInt(0)) {
      return toast.error("Amount harus lebih dari 0!");
    }

    setActiveAction(actionName);
    toast.loading(`Confirm ${actionName} in wallet...`, { id: "tx" });

    writeContract(config, {
      onError: (err) => {
        console.error(`${actionName} Error:`, err);
        toast.error(`Gagal: ${err.message?.split("\n")[0].slice(0, 40)}`, { id: "tx" });
        setActiveAction(null);
      },
      onSuccess: () => {
        toast.loading(`${actionName} pending on-chain...`, { id: "tx" });
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
    <div className="min-h-screen bg-[#070A0E] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <GlowLogo />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-extrabold tracking-tight">
                  NFT-Boosted <span className="text-emerald-300">Staking</span>
                </div>
                <Badge tone="emerald">Robinhood Testnet</Badge>
              </div>
              <div className="mt-1 text-sm text-white/55">
                Stake ERC20, claim rewards, and get boosted yield with NFTs.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {/* Tombol Faucet */}
            {isConnected && (
               <Button variant="outline" onClick={doFaucet} disabled={busy}>
                 {activeAction === "Faucet" ? "Sending..." : "💧 Faucet 100 KRM"}
               </Button>
            )}

            {isConnected ? (
              <>
                <Badge tone="zinc">{shortAddr(address)}</Badge>
                <Button variant="secondary" onClick={() => disconnect()} disabled={busy}>Disconnect</Button>
              </>
            ) : (
              <Button onClick={() => connect({ connector: injected() })} disabled={busy}>
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Info Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card title="Wallet Balances">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-white/60">KRM Token</span>
                  <span className="font-semibold text-emerald-200">{tokenBalFmt}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-white/60">NFT Booster</span>
                  <span className="font-semibold">{nftBalFmt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Contract Allowance</span>
                  <span className="font-semibold text-white/50">{allowanceFmt} KRM</span>
                </div>
              </div>
            </Card>

            <Card title="Your Staking Position">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-white/60">Staked Amount</span>
                  <span className="font-semibold text-sky-200">{stakedFmt} KRM</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-white/60">Pending Rewards</span>
                  <span className="font-semibold text-emerald-300">{pendingFmt} KRM</span>
                </div>
                <div className="pt-1">
                   <Button variant="outline" className="w-full text-xs py-1.5" onClick={doClaim} disabled={!isConnected || busy || pendingFmt === "0" || pendingFmt === "0.0"}>
                    {activeAction === "Claim" ? "Claiming..." : "Claim Rewards 💸"}
                   </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Action Card */}
          <Card title="Manage Stake" className="lg:col-span-1 border border-emerald-500/20 bg-emerald-950/10">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-white/55 mb-1.5 px-1">
                  <span>Amount (KRM)</span>
                  <div className="space-x-2">
                    <button onClick={handleMaxStake} className="hover:text-emerald-300 transition">Max Stake</button>
                    <span>|</span>
                    <button onClick={handleMaxUnstake} className="hover:text-amber-300 transition">Max Unstake</button>
                  </div>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-xl bg-black/40 ring-1 ring-white/10 px-4 py-3 text-sm outline-none focus:ring-emerald-400/50 transition-all font-mono"
                />
              </div>

              <div className="flex flex-col gap-2">
                {/* SMART BUTTON: Approve / Stake */}
                {canApprove ? (
                   <Button onClick={doApprove} disabled={!isConnected || busy} className="w-full py-3">
                     {activeAction === "Approve" ? "Approving..." : "1. Approve KRM"}
                   </Button>
                ) : (
                   <Button onClick={doStake} disabled={!isConnected || busy || parsedAmount <= BigInt(0)} className="w-full py-3">
                     {activeAction === "Stake" ? "Staking..." : "Stake Tokens"}
                   </Button>
                )}

                <Button variant="secondary" onClick={doUnstake} disabled={!isConnected || busy || parsedAmount <= BigInt(0)} className="w-full">
                  {activeAction === "Unstake" ? "Unstaking..." : "Unstake"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Footer & Help */}
          <div className="lg:col-span-3 flex justify-between items-center px-2 opacity-50 text-xs">
            <div>Built by <span className="text-emerald-200 font-semibold">Karimkusin88</span></div>
            <div>Block: {bn.data?.toString() ?? "..."}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
