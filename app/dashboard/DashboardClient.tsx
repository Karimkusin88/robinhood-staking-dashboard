"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useAccount,
  useBalance,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
  useBlockNumber,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits, parseAbi, parseUnits } from "viem";
import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS } from "@/lib/constants";

/**
 * ====== Product constants (biar gak perlu edit file lain dulu) ======
 * Nanti kalau mau rapihin, baru pindahin ke lib/constants.ts
 */
const CHAIN_ID = 46630;
const EXPLORER_BASE = "https://explorer.testnet.chain.robinhood.com";
const EXPLORER_ADDRESS = `${EXPLORER_BASE}/address/`;
const EXPLORER_TX = `${EXPLORER_BASE}/tx/`;
const ROBINHOOD_GLOBAL_FAUCET = "https://faucet.testnet.chain.robinhood.com/";
const BUILDER_X = "https://x.com/Karimkusin";

const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
]);

const erc721Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

// ⚠️ stakingAbi ini harus cocok sama contract lo.
// Kalau contract lo beda, nanti kita ganti signature-nya.
const stakingAbi = parseAbi([
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claim()",
  "function userInfo(address) view returns (uint256 stakedAmount, uint256 rewardDebt)",
  "function pendingRewards(address) view returns (uint256)",
]);

function shortAddr(a?: string) {
  if (!a) return "-";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatCompactNumber(n: number, maxFraction = 2) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: maxFraction,
  }).format(n);
}

function formatTokenCompact(value: bigint, decimals = 18, maxFraction = 2) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;

  const fracStr = frac.toString().padStart(decimals, "0").slice(0, maxFraction);
  const asNumber = Number(whole) + Number(`0.${fracStr || "0"}`);

  if (!Number.isFinite(asNumber)) return formatUnits(value, decimals);
  return formatCompactNumber(asNumber, maxFraction);
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
        className
      )}
    >
      <div className="text-sm font-semibold text-white/85">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Badge({
  children,
  tone = "emerald",
  pulse = false,
}: {
  children: React.ReactNode;
  tone?: "emerald" | "blue" | "zinc" | "amber";
  pulse?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20"
      : tone === "blue"
      ? "bg-sky-400/10 text-sky-200 ring-sky-300/20"
      : tone === "amber"
      ? "bg-amber-400/10 text-amber-200 ring-amber-300/20"
      : "bg-white/5 text-white/70 ring-white/10";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1",
        toneClass,
        pulse && "animate-pulse"
      )}
    >
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "amber";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const v =
    variant === "primary"
      ? "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/20 hover:bg-emerald-400/20"
      : variant === "amber"
      ? "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20 hover:bg-amber-400/20"
      : "bg-white/6 text-white/80 ring-1 ring-white/10 hover:bg-white/10";
  return (
    <button className={cn(base, v)} onClick={onClick} disabled={disabled}>
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

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/70">{label}</span>
      <span className={cn("font-semibold", ok ? "text-emerald-200" : "text-white/40")}>{ok ? "✅" : "⬜"}</span>
    </div>
  );
}

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [amount, setAmount] = useState("0.0");
  const [showHelp, setShowHelp] = useState(false);

  const bn = useBlockNumber({ watch: true });

  // Native balance (buat checklist "Has Gas")
  const nativeBal = useBalance({
    address: address as `0x${string}` | undefined,
    query: { enabled: !!address },
  });

  // Reads
  const decimals = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS as `0x${string}`,
    functionName: "decimals",
    query: { enabled: true },
  });

  const tokenBalance = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS as `0x${string}`,
    functionName: "balanceOf",
    args: address ? ([address] as [`0x${string}`]) : undefined,
    query: { enabled: !!address },
  });

  const allowance = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS as `0x${string}`,
    functionName: "allowance",
    args: address ? ([address, STAKING_ADDRESS] as [`0x${string}`, `0x${string}`]) : undefined,
    query: { enabled: !!address },
  });

  const nftBalance = useReadContract({
    abi: erc721Abi,
    address: NFT_ADDRESS as `0x${string}`,
    functionName: "balanceOf",
    args: address ? ([address] as [`0x${string}`]) : undefined,
    query: { enabled: !!address },
  });

  const userInfo = useReadContract({
    abi: stakingAbi,
    address: STAKING_ADDRESS as `0x${string}`,
    functionName: "userInfo",
    args: address ? ([address] as [`0x${string}`]) : undefined,
    query: { enabled: !!address },
  });

  const pendingRewards = useReadContract({
    abi: stakingAbi,
    address: STAKING_ADDRESS as `0x${string}`,
    functionName: "pendingRewards",
    args: address ? ([address] as [`0x${string}`]) : undefined,
    query: { enabled: !!address },
  });

  // Auto refresh per block (biar live)
  useEffect(() => {
    if (!isConnected) return;
    tokenBalance.refetch?.();
    allowance.refetch?.();
    nftBalance.refetch?.();
    userInfo.refetch?.();
    pendingRewards.refetch?.();
    nativeBal.refetch?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bn.data, isConnected]);

  const dec = Number(decimals.data ?? 18);

  const parsedAmount = useMemo(() => {
    try {
      if (!amount) return 0n;
      return parseUnits(amount, dec);
    } catch {
      return 0n;
    }
  }, [amount, dec]);

  const tokenBalFmt = useMemo(() => {
    const v = tokenBalance.data;
    if (typeof v !== "bigint") return "-";
    return `${formatTokenCompact(v, dec)} (${formatUnits(v, dec)})`;
  }, [tokenBalance.data, dec]);

  const MaxUint256 = 2n ** 256n - 1n;

  const allowanceFmt = useMemo(() => {
    const v = allowance.data;
    if (typeof v !== "bigint") return "-";

    // Unlimited allowance → ∞
    if (v > MaxUint256 / 2n) return "∞ (Unlimited)";

    // Compact
    return `${formatTokenCompact(v, dec, 2)} (${Number(formatUnits(v, dec)).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })})`;
  }, [allowance.data, dec, MaxUint256]);

  const nftBalFmt = useMemo(() => {
    const v = nftBalance.data;
    if (typeof v !== "bigint") return "-";
    return v.toString();
  }, [nftBalance.data]);

  const stakedBig = useMemo(() => {
    const v: any = userInfo.data;
    if (!v) return 0n;
    const staked = Array.isArray(v) ? v[0] : v.stakedAmount;
    if (typeof staked !== "bigint") return 0n;
    return staked;
  }, [userInfo.data]);

  const stakedFmt = useMemo(() => {
    if (!userInfo.data) return "-";
    return `${formatTokenCompact(stakedBig, dec)} (${formatUnits(stakedBig, dec)})`;
  }, [stakedBig, userInfo.data, dec]);

  const pendingFmt = useMemo(() => {
    const v = pendingRewards.data;
    if (typeof v !== "bigint") return "-";
    return `${formatTokenCompact(v, dec)} (${formatUnits(v, dec)})`;
  }, [pendingRewards.data, dec]);

  // Writes + tx tracking
  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const tx = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isWriting) toast.loading("Waiting wallet signature…", { id: "tx" });
  }, [isWriting]);

  useEffect(() => {
    if (tx.isLoading) toast.loading("Tx pending…", { id: "tx" });
    if (tx.isSuccess) toast.success("Tx confirmed ✅", { id: "tx" });
    if (tx.isError) toast.error("Tx failed ❌ (check console)", { id: "tx" });
  }, [tx.isLoading, tx.isSuccess, tx.isError]);

  const maxUint256 = MaxUint256;

  const canApprove = useMemo(() => {
    if (!isConnected) return false;
    if (typeof allowance.data !== "bigint") return true;
    // kalau allowance < amount → butuh approve
    return allowance.data < parsedAmount;
  }, [isConnected, allowance.data, parsedAmount]);

  function doConnect() {
    connect({ connector: injected() });
  }

  function handleApprove() {
    try {
      toast.loading("Sending approve…", { id: "tx" });
      writeContract({
        abi: erc20Abi,
        address: TOKEN_ADDRESS as `0x${string}`,
        functionName: "approve",
        args: [STAKING_ADDRESS as `0x${string}`, maxUint256],
      });
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Approve failed", { id: "tx" });
    }
  }

  function handleStake() {
    try {
      if (parsedAmount <= 0n) return toast.error("Amount must be > 0");
      toast.loading("Sending stake…", { id: "tx" });
      writeContract({
        abi: stakingAbi,
        address: STAKING_ADDRESS as `0x${string}`,
        functionName: "stake",
        args: [parsedAmount],
      });
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Stake failed", { id: "tx" });
    }
  }

  function handleUnstake() {
    try {
      if (parsedAmount <= 0n) return toast.error("Amount must be > 0");
      toast.loading("Sending unstake…", { id: "tx" });
      writeContract({
        abi: stakingAbi,
        address: STAKING_ADDRESS as `0x${string}`,
        functionName: "unstake",
        args: [parsedAmount],
      });
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Unstake failed", { id: "tx" });
    }
  }

  function handleClaim() {
    try {
      toast.loading("Sending claim…", { id: "tx" });
      writeContract({
        abi: stakingAbi,
        address: STAKING_ADDRESS as `0x${string}`,
        functionName: "claim",
        args: [],
      });
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Claim failed", { id: "tx" });
    }
  }

  const busy = isConnecting || isWriting || tx.isLoading || isSwitching;

  const wrongNetwork = isConnected && currentChainId !== CHAIN_ID;

  const hasGas = useMemo(() => {
    const v = nativeBal.data?.value;
    if (typeof v !== "bigint") return false;
    return v > 0n;
  }, [nativeBal.data]);

  const approved = useMemo(() => {
    if (!isConnected) return false;
    if (typeof allowance.data !== "bigint") return false;
    return allowance.data > 0n;
  }, [isConnected, allowance.data]);

  const stakedOk = useMemo(() => stakedBig > 0n, [stakedBig]);

  const nftHas = useMemo(() => {
    const v = nftBalance.data;
    if (typeof v !== "bigint") return false;
    return v > 0n;
  }, [nftBalance.data]);

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
                  NFT-Boosted Staking <span className="text-emerald-300">Dashboard</span>
                </div>
                <Badge tone="emerald">Robinhood Testnet</Badge>
                <Badge tone="blue" pulse>
                  Block: {bn.data?.toString() ?? "-"}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-white/55">
                Stake ERC20, claim rewards, and get boosted yield when you hold the NFT.
              </div>
            </div>
          </div>

          {/* Right side: shortcuts + wallet */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={BUILDER_X}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                X ↗
              </a>

              <a
                href={`${EXPLORER_ADDRESS}${TOKEN_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                Token ↗
              </a>

              <a
                href={`${EXPLORER_ADDRESS}${STAKING_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                Staking ↗
              </a>

              <a
                href={`${EXPLORER_ADDRESS}${NFT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                NFT ↗
              </a>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Badge tone="zinc">{shortAddr(address)}</Badge>
                  <Button variant="secondary" onClick={() => disconnect()} disabled={busy}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={doConnect} disabled={busy}>
                  {isConnecting ? "Connecting…" : "Connect Wallet"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Network guard */}
        {wrongNetwork && (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 ring-1 ring-amber-300/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-200">Wrong network</div>
                <div className="mt-1 text-sm text-white/70">
                  Switch to <span className="text-amber-200 font-semibold">Robinhood Testnet</span> (chainId:{" "}
                  {CHAIN_ID})
                </div>
              </div>
              <Button
                variant="amber"
                onClick={() => switchChain({ chainId: CHAIN_ID })}
                disabled={busy}
              >
                {isSwitching ? "Switching…" : "Switch Network"}
              </Button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Getting Started */}
          <Card title="Getting Started" className="lg:col-span-1">
            <div className="space-y-2">
              <CheckItem ok={isConnected} label="Connect wallet" />
              <CheckItem ok={hasGas} label="Have testnet gas" />
              <CheckItem ok={approved} label="Approve KRM" />
              <CheckItem ok={stakedOk} label="Stake KRM" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={ROBINHOOD_GLOBAL_FAUCET}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
              >
                Open Gas Faucet ↗
              </a>
            </div>

            <div className="mt-3 text-xs text-white/50">
              Note: gas faucet itu buat token native (buat fee tx). KRM balance tetap dari token contract.
            </div>
          </Card>

          {/* Faucet card */}
          <Card title="Get Testnet Gas" className="lg:col-span-1">
            <div className="text-sm text-white/70">
              Kalau wallet baru, claim gas dulu biar bisa approve/stake.
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={ROBINHOOD_GLOBAL_FAUCET}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
              >
                Robinhood Faucet ↗
              </a>

              {nativeBal.data?.formatted && (
                <Badge tone="zinc">Gas: {nativeBal.data.formatted.slice(0, 8)}</Badge>
              )}
            </div>

            <div className="mt-3 text-xs text-white/50">
              Setelah claim, balik ke dashboard → Approve → Stake.
            </div>
          </Card>

          {/* NFT Boost indicator */}
          <Card title="NFT Boost" className="lg:col-span-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Status</span>
              {nftHas ? <Badge tone="emerald">Boost Active</Badge> : <Badge tone="zinc">No Boost</Badge>}
            </div>
            <div className="mt-2 text-sm text-white/60">
              {nftHas ? "Kamu punya NFT → yield boost aktif." : "Hold NFT untuk aktifkan boost yield."}
            </div>
            <div className="mt-3 text-xs text-white/50">NFT Balance: {nftBalFmt}</div>
          </Card>

          {/* Balances */}
          <Card title="Balances" className="lg:col-span-1">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/60">KRM Balance</span>
                <span className="font-semibold">{tokenBalFmt}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/60">Allowance</span>
                <span className="font-semibold">{allowanceFmt}</span>
              </div>

              <div className="mt-3 text-xs text-white/50">
                Unlimited allowance ditandai <span className="text-white/70">∞</span>.
              </div>
            </div>
          </Card>

          {/* Staked */}
          <Card title="Staked" className="lg:col-span-1">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Staked Amount</span>
                <span className="font-semibold">{stakedFmt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Pending Rewards</span>
                <span className="font-semibold">{pendingFmt}</span>
              </div>
              <div className="mt-3 text-xs text-white/50">
                Tip: kalau angka nggak load, cek network wallet + RPC.
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card title="Actions" className="lg:col-span-1">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-white/55 mb-1">Amount</div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-emerald-300/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleApprove} disabled={!isConnected || !canApprove || busy || wrongNetwork}>
                  {canApprove ? "Approve" : "Approved"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleStake}
                  disabled={!isConnected || busy || canApprove || wrongNetwork}
                >
                  Stake
                </Button>
                <Button variant="secondary" onClick={handleUnstake} disabled={!isConnected || busy || wrongNetwork}>
                  Unstake
                </Button>
                <Button variant="secondary" onClick={handleClaim} disabled={!isConnected || busy || wrongNetwork}>
                  Claim
                </Button>
              </div>

              <div className="text-xs text-white/50">
                {wrongNetwork
                  ? "Switch network dulu biar tx gak gagal."
                  : canApprove
                  ? "Approve dulu kalau allowance kurang."
                  : "Approve OK. Lo bisa Stake."}
              </div>

              {txHash && (
                <a
                  href={`${EXPLORER_TX}${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-xs text-emerald-200 hover:text-emerald-100"
                >
                  View tx on explorer ↗
                </a>
              )}
            </div>
          </Card>

          {/* Help */}
          <div className="lg:col-span-2 rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white/85">Help</div>
              <button
                onClick={() => setShowHelp((v) => !v)}
                className="text-xs text-emerald-200 hover:text-emerald-100"
              >
                {showHelp ? "Hide" : "Show"}
              </button>
            </div>

            {showHelp && (
              <ul className="mt-2 space-y-1 text-sm text-white/60 list-disc pl-5">
                <li>Approve dulu kalau allowance 0 / kurang dari amount.</li>
                <li>Kalau Stake/Claim error, screenshot toast biar gue cocokkan ABI staking lo.</li>
                <li>“Live” update jalan tiap block (lihat badge Block).</li>
                <li>Kalau stuck tx: cek gas (claim di faucet) + pastiin chain Robinhood Testnet.</li>
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-4">
            <div className="text-sm font-semibold text-white/85">Build</div>
            <div className="mt-2 text-sm text-white/60">
              Built by <span className="text-emerald-200 font-semibold">Karimkusin88</span>{" "}
              <a href={BUILDER_X} target="_blank" rel="noreferrer" className="text-emerald-200 hover:text-emerald-100">
                (X ↗)
              </a>
            </div>
            <div className="mt-1 text-xs text-white/45">v0.1 • alpha polish • explorer links • network guard</div>
          </div>
        </div>
      </div>
    </div>
  );
}
