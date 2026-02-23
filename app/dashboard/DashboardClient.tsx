"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits, parseAbi, parseUnits } from "viem";
import { useWaitForTransactionReceipt } from "wagmi";

import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS } from "@/lib/constants";

// --- Minimal ABIs (aman & cukup buat dashboard) ---
const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
]);

const erc721Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);

// NOTE: kalau staking contract lu beda signature, tinggal sesuaikan 4 function ini.
const stakingAbi = parseAbi([
  "function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)",
  "function pendingRewards(address) view returns (uint256)",
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claim()",
]);

function shortAddr(addr?: string) {
  if (!addr) return "-";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Badge({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "gray" | "red" | "blue";
}) {
  const toneCls =
    tone === "green"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
      : tone === "red"
      ? "bg-red-500/15 text-red-300 ring-red-500/20"
      : tone === "blue"
      ? "bg-sky-500/15 text-sky-300 ring-sky-500/20"
      : "bg-white/10 text-white/70 ring-white/15";

  return (
    <span className={classNames("inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1", toneCls)}>
      {children}
    </span>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-lg backdrop-blur px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white/85">{title}</div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-sm text-white/55">{label}</div>
      <div className="text-sm font-semibold text-white/90">{value}</div>
    </div>
  );
}

function GlowLogo() {
  // “Robinhood vibe” tanpa ambil asset luar (biar aman). Nanti bisa lu ganti pake /public/logo.svg.
  return (
    <div className="relative h-10 w-10">
      <div className="absolute inset-0 rounded-2xl bg-emerald-400/30 blur-md animate-pulse" />
      <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400/25 to-slate-900/40 ring-1 ring-emerald-400/25 flex items-center justify-center">
        <span className="font-black text-emerald-200">RH</span>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [amount, setAmount] = useState<string>("");

  // --- Reads: token meta ---
  const tokenSymbol = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS,
    functionName: "symbol",
    query: { staleTime: 20_000 },
  });

  const tokenDecimals = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS,
    functionName: "decimals",
    query: { staleTime: 60_000 },
  });

  const decimals = Number(tokenDecimals.data ?? 18);

  // --- Reads: balances/allowance ---
  const tokenBalance = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });

  const nftBalance = useReadContract({
    abi: erc721Abi,
    address: NFT_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  const allowance = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESS,
    functionName: "allowance",
    args: address ? [address, STAKING_ADDRESS] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });

  // --- Reads: staking info ---
  const userInfo = useReadContract({
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "userInfo",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });

  const pendingRewards = useReadContract({
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });

  // --- Parsed amounts (NO bigint literal, pakai BigInt()) ---
  const parsedAmount = useMemo(() => {
    try {
      if (!amount) return BigInt(0);
      return parseUnits(amount, decimals);
    } catch {
      return BigInt(0);
    }
  }, [amount, decimals]);

  const tokenBal = useMemo(() => {
    const v = tokenBalance.data ?? BigInt(0);
    try {
      return Number(formatUnits(v, decimals));
    } catch {
      return 0;
    }
  }, [tokenBalance.data, decimals]);

  const allowanceVal = allowance.data ?? BigInt(0);
  const stakedAmount = useMemo(() => {
    const ui = userInfo.data as unknown as { amount: bigint; rewardDebt: bigint } | undefined;
    const v = ui?.amount ?? BigInt(0);
    try {
      return Number(formatUnits(v, decimals));
    } catch {
      return 0;
    }
  }, [userInfo.data, decimals]);

  const pendingVal = useMemo(() => {
    const v = pendingRewards.data ?? BigInt(0);
    try {
      return Number(formatUnits(v, decimals));
    } catch {
      return 0;
    }
  }, [pendingRewards.data, decimals]);

  // --- Writes ---
  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const tx = useWaitForTransactionReceipt({ hash: txHash });

  const canApprove = isConnected && parsedAmount > BigInt(0) && allowanceVal < parsedAmount;
  const canStake = isConnected && parsedAmount > BigInt(0) && allowanceVal >= parsedAmount;
  const canUnstake = isConnected && parsedAmount > BigInt(0) && stakedAmount > 0;
  const canClaim = isConnected && pendingRewards.data && (pendingRewards.data as bigint) > BigInt(0);

  const symbol = (tokenSymbol.data as string | undefined) ?? "TOKEN";

  function handleConnect() {
    connect({ connector: injected() });
  }

  function handleApprove() {
    // Max uint256 via string (biar aman & gak pakai literal 0n/1n)
    const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    writeContract({
      abi: erc20Abi,
      address: TOKEN_ADDRESS,
      functionName: "approve",
      args: [STAKING_ADDRESS, MAX_UINT256],
    });
  }

  function handleStake() {
    writeContract({
      abi: stakingAbi,
      address: STAKING_ADDRESS,
      functionName: "stake",
      args: [parsedAmount],
    });
  }

  function handleUnstake() {
    writeContract({
      abi: stakingAbi,
      address: STAKING_ADDRESS,
      functionName: "unstake",
      args: [parsedAmount],
    });
  }

  function handleClaim() {
    writeContract({
      abi: stakingAbi,
      address: STAKING_ADDRESS,
      functionName: "claim",
      args: [],
    });
  }

  // --- little “smooth counter” feeling ---
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-[calc(100vh-0px)] bg-[#070B14] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute top-40 left-10 h-[320px] w-[320px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        {/* Top bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <GlowLogo />
            <div>
              <div className="text-lg font-extrabold tracking-tight">
                NFT-Boosted Staking <span className="text-emerald-300">Dashboard</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone="green">Robinhood Testnet</Badge>
                <Badge tone="gray">ChainID: {chainId ?? "-"}</Badge>
                <Badge tone="blue">Live</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-white/70">
                  <span className="hidden sm:inline">Connected:</span>{" "}
                  <span className="font-semibold text-white/90">{shortAddr(address)}</span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15 transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="rounded-xl bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-400/30 hover:bg-emerald-400/25 transition disabled:opacity-60"
              >
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card
            title="Balances"
            right={<span className="text-xs text-white/50">refresh {tick}</span>}
          >
            <div className="space-y-2">
              <Stat label={`${symbol} Balance`} value={`${tokenBal.toLocaleString()} ${symbol}`} />
              <Stat
                label="NFT Balance"
                value={`${Number(nftBalance.data ?? BigInt(0)).toLocaleString()} NFT`}
              />
              <Stat
                label="Allowance"
                value={
                  allowanceVal === BigInt(0) ? (
                    <span className="text-red-300">0 (need approve)</span>
                  ) : (
                    <span className="text-emerald-200">OK</span>
                  )
                }
              />
            </div>
          </Card>

          <Card title="Staked">
            <div className="space-y-2">
              <Stat label="Staked Amount" value={`${stakedAmount.toLocaleString()} ${symbol}`} />
              <Stat label="Pending Rewards" value={`${pendingVal.toLocaleString()} ${symbol}`} />
              <div className="mt-3 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-xs text-white/60">
                Jika angka “- / 0” terus, biasanya <b>RPC/chain mismatch</b> atau <b>alamat contract</b> salah.
              </div>
            </div>
          </Card>

          <Card title="Actions" right={isWriting || tx.isLoading ? <Badge tone="blue">Tx pending…</Badge> : null}>
            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-xs text-white/60">Amount</div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`0.0 ${symbol}`}
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-emerald-400/35"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleApprove}
                  disabled={!canApprove || isWriting || tx.isLoading}
                  className={classNames(
                    "rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition",
                    canApprove
                      ? "bg-emerald-400/20 text-emerald-100 ring-emerald-400/30 hover:bg-emerald-400/25"
                      : "bg-white/5 text-white/35 ring-white/10 cursor-not-allowed"
                  )}
                >
                  Approve
                </button>

                <button
                  onClick={handleStake}
                  disabled={!canStake || isWriting || tx.isLoading}
                  className={classNames(
                    "rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition",
                    canStake
                      ? "bg-sky-400/20 text-sky-100 ring-sky-400/30 hover:bg-sky-400/25"
                      : "bg-white/5 text-white/35 ring-white/10 cursor-not-allowed"
                  )}
                >
                  Stake
                </button>

                <button
                  onClick={handleUnstake}
                  disabled={!canUnstake || isWriting || tx.isLoading}
                  className={classNames(
                    "rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition",
                    canUnstake
                      ? "bg-white/10 text-white/85 ring-white/15 hover:bg-white/15"
                      : "bg-white/5 text-white/35 ring-white/10 cursor-not-allowed"
                  )}
                >
                  Unstake
                </button>

                <button
                  onClick={handleClaim}
                  disabled={!canClaim || isWriting || tx.isLoading}
                  className={classNames(
                    "rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition",
                    canClaim
                      ? "bg-purple-400/20 text-purple-100 ring-purple-400/30 hover:bg-purple-400/25"
                      : "bg-white/5 text-white/35 ring-white/10 cursor-not-allowed"
                  )}
                >
                  Claim
                </button>
              </div>

              {/* Tx status */}
              <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-xs text-white/60">
                {tx.isLoading && "Menunggu konfirmasi tx…"}
                {tx.isSuccess && <span className="text-emerald-200">Tx sukses ✅</span>}
                {tx.isError && <span className="text-red-300">Tx gagal ❌ (cek console)</span>}
                {!tx.isLoading && !tx.isSuccess && !tx.isError && "Tips: Approve dulu kalau allowance 0."}
              </div>
            </div>
          </Card>
        </div>

        {/* Notes / footer */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-4">
            <div className="text-sm font-semibold text-white/85">Notes</div>
            <ul className="mt-2 space-y-1 text-sm text-white/60 list-disc pl-5">
              <li>Kalau tombol disabled, biasanya karena allowance/staked/pending belum memenuhi.</li>
              <li>Kalau angka nggak ke-load, cek chain wallet + RPC + address contract di <code className="text-white/80">lib/constants.ts</code>.</li>
              <li>Kalau error muncul pas klik tombol, kirim screenshot console biar gue bedah persis revert-nya.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-4 flex flex-col justify-between">
            <div>
              <div className="text-sm font-semibold text-white/85">Build</div>
              <div className="mt-2 text-sm text-white/60">
                Build by <span className="text-emerald-200 font-semibold">karimkusin88</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-white/45">
              v0.1 • UI polish + smooth motion • ready for Vercel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
