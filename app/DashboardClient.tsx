"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits, parseAbi, parseUnits } from "viem";
import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS } from "@/lib/constants";

const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
]);

const erc721Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

const stakingAbi = parseAbi([
  "function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)",
  "function pendingBase(address) view returns (uint256)",
  "function pendingRewards(address) view returns (uint256)",
  "function getMultiplier(address) view returns (uint256)",
  "function stake(uint256)",
  "function unstake(uint256)",
  "function claim()",
]);

const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: 18,
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { disabled } = props;
  return (
    <button
      {...props}
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: disabled ? "rgba(255,255,255,0.06)" : "linear-gradient(90deg,#00ff88,#00c2ff)",
        color: disabled ? "rgba(255,255,255,0.6)" : "black",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
      }}
    />
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        outline: "none",
        background: "rgba(0,0,0,0.25)",
        color: "white",
      }}
    />
  );
}

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [stakeAmt, setStakeAmt] = useState("10");
  const [unstakeAmt, setUnstakeAmt] = useState("1");

  const enabled = Boolean(address);

  const { data: decimalsData } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const decimals = Number(decimalsData ?? 18);

  const { data: tokenBal } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: nftBal } = useReadContract({
    address: NFT_ADDRESS as `0x${string}`,
    abi: erc721Abi,
    functionName: "balanceOf",
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 5000 },
  });

  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: enabled ? [address!, STAKING_ADDRESS as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: userInfo } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: "userInfo",
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: pendingBase } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: "pendingBase",
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: pendingRewards } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: "pendingRewards",
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: multiplier } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: "getMultiplier",
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 5000 },
  });

  const stakedAmount = (userInfo?.[0] ?? BigInt(0)) as bigint;

  const fmt = (v?: bigint) => (v ? Number(formatUnits(v, decimals)).toLocaleString() : "0");
  const fmtInt = (v?: bigint) => (v ? v.toString() : "0");

  const tokenBalHuman = useMemo(() => fmt(tokenBal as bigint), [tokenBal, decimals]);
  const stakedHuman = useMemo(() => fmt(stakedAmount), [stakedAmount, decimals]);
  const pendingBaseHuman = useMemo(() => fmt(pendingBase as bigint), [pendingBase, decimals]);
  const pendingRewardsHuman = useMemo(() => fmt(pendingRewards as bigint), [pendingRewards, decimals]);
  const nftCountHuman = useMemo(() => fmtInt(nftBal as bigint), [nftBal]);

  const multiplierHuman = useMemo(() => {
    const mBig = (multiplier ?? BigInt(0)) as bigint;
    if (!mBig) return "—";
    const mStr = (Number(mBig) / 10000).toFixed(2);
    return `${mStr}x (${mBig.toString()})`;
  }, [multiplier]);

  const hasAllowance = useMemo(() => {
    try {
      const need = parseUnits(stakeAmt || "0", decimals);
      return ((allowance ?? BigInt(0)) as bigint) >= need;
    } catch {
      return false;
    }
  }, [allowance, stakeAmt, decimals]);

  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isMining } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isWriting || isMining;

  function approveMax() {
    writeContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [STAKING_ADDRESS as `0x${string}`, MAX_UINT256],
    });
  }

  function stake() {
    const amt = parseUnits(stakeAmt || "0", decimals);
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: "stake",
      args: [amt],
    });
  }

  function unstake() {
    const amt = parseUnits(unstakeAmt || "0", decimals);
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: "unstake",
      args: [amt],
    });
  }

  function claim() {
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: "claim",
      args: [],
    });
  }

  const shortAddr =
    typeof address === "string" ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 20% 20%, rgba(0,255,136,0.25), transparent 40%), radial-gradient(circle at 80% 20%, rgba(0,194,255,0.22), transparent 45%), #05060a",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 950 }}>🔥 NFT Boost Staking Dashboard</div>
            <div style={{ opacity: 0.8, marginTop: 6, lineHeight: 1.5 }}>
              <div>Token: <code>{TOKEN_ADDRESS}</code></div>
              <div>NFT: <code>{NFT_ADDRESS}</code></div>
              <div>Staking: <code>{STAKING_ADDRESS}</code></div>
            </div>
          </div>

          {!isConnected ? (
            <Button disabled={isConnecting} onClick={() => connect({ connector: injected() })}>
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </Button>
          ) : (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>{shortAddr}</div>
              <Button onClick={() => disconnect()}>Disconnect</Button>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 18 }}>
          <Card title="Balances">
            <div>ERC20: <b>{tokenBalHuman}</b></div>
            <div style={{ marginTop: 8 }}>NFT count: <b>{nftCountHuman}</b></div>
          </Card>

          <Card title="Staking">
            <div>Staked: <b>{stakedHuman}</b></div>
            <div style={{ marginTop: 8 }}>Multiplier: <b>{multiplierHuman}</b></div>
          </Card>

          <Card title="Rewards (auto-refresh)">
            <div>Pending base: <b>{pendingBaseHuman}</b></div>
            <div style={{ marginTop: 8 }}>Pending boosted: <b>{pendingRewardsHuman}</b></div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, marginTop: 14 }}>
          <Card title="Stake">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <Input value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} placeholder="Amount" />
              </div>
              {!hasAllowance ? (
                <Button disabled={busy || !isConnected} onClick={approveMax}>
                  {busy ? "Processing…" : "Approve"}
                </Button>
              ) : (
                <Button disabled={busy || !isConnected} onClick={stake}>
                  {busy ? "Processing…" : "Stake"}
                </Button>
              )}
            </div>
            <div style={{ opacity: 0.75, marginTop: 10, fontSize: 12 }}>
              Tip: Approve sekali (max), habis itu stake berkali-kali.
            </div>
          </Card>

          <Card title="Claim / Unstake">
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <Button disabled={busy || !isConnected} onClick={claim}>
                {busy ? "Processing…" : "Claim"}
              </Button>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <Input value={unstakeAmt} onChange={(e) => setUnstakeAmt(e.target.value)} placeholder="Amount" />
              </div>
              <Button disabled={busy || !isConnected} onClick={unstake}>
                {busy ? "Processing…" : "Unstake"}
              </Button>
            </div>

            {txHash && (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                Tx: <code>{txHash}</code>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}