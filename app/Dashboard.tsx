'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from 'wagmi'
import { injected } from 'wagmi/connectors'
import { formatUnits, parseAbi, parseUnits } from 'viem'
import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS } from '@/lib/constants'

/**
 * NOTE:
 * - REQUIRED_CHAIN_ID harus sama dengan Robinhood testnet chainId lu.
 * - Di log hardhat lu chainId = 46630 (0xb636)
 */
const REQUIRED_CHAIN_ID = 46630

const EXPLORER_TX = 'https://explorer.testnet.chain.robinhood.com/tx/'
const EXPLORER_ADDR = 'https://explorer.testnet.chain.robinhood.com/address/'

const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function decimals() view returns (uint8)',
])

const erc721Abi = parseAbi(['function balanceOf(address) view returns (uint256)'])

const stakingAbi = parseAbi([
  'function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)',
  'function pendingBase(address) view returns (uint256)',
  'function pendingRewards(address) view returns (uint256)',
  'function getMultiplier(address) view returns (uint256)',
  'function stake(uint256)',
  'function unstake(uint256)',
  'function claim()',
])

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18,
        padding: 16,
        background: 'rgba(255,255,255,0.05)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const { disabled, variant = 'primary' } = props
  const bg =
    variant === 'primary'
      ? disabled
        ? 'rgba(255,255,255,0.10)'
        : 'white'
      : 'transparent'
  const color = variant === 'primary' ? (disabled ? 'rgba(255,255,255,0.55)' : 'black') : 'white'
  const border = variant === 'primary' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.18)'

  return (
    <button
      {...props}
      style={{
        padding: '10px 12px',
        borderRadius: 14,
        border,
        background: bg,
        color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 900,
      }}
    />
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.16)',
        background: 'rgba(0,0,0,0.25)',
        color: 'white',
        outline: 'none',
      }}
    />
  )
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

// animasi angka halus (tanpa library)
function useAnimatedNumber(target: number, ms = 550) {
  const [value, setValue] = useState(target)
  const raf = useRef<number | null>(null)
  const startRef = useRef(0)
  const fromRef = useRef(target)

  useEffect(() => {
    if (!Number.isFinite(target)) return
    const from = value
    fromRef.current = from
    startRef.current = performance.now()

    const tick = (t: number) => {
      const p = clamp((t - startRef.current) / ms, 0, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const next = fromRef.current + (target - fromRef.current) * eased
      setValue(next)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }

    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()

  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isRightNetwork = chainId === REQUIRED_CHAIN_ID
  const enabled = Boolean(isConnected && typeof address === 'string' && isRightNetwork)

  const [stakeAmt, setStakeAmt] = useState('10')
  const [unstakeAmt, setUnstakeAmt] = useState('1')

  const { data: decimalsData } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: isConnected && typeof address === 'string' },
  })
  const decimals = Number(decimalsData ?? 18)

  const { data: tokenBal } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: enabled ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 6000 },
  })

  const { data: nftBal } = useReadContract({
    address: NFT_ADDRESS as `0x${string}`,
    abi: erc721Abi,
    functionName: 'balanceOf',
    args: enabled ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 12000 },
  })

  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: enabled ? [address as `0x${string}`, STAKING_ADDRESS as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 6000 },
  })

  const { data: userInfo } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'userInfo',
    args: enabled ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 6000 },
  })

  const { data: pendingBase } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'pendingBase',
    args: enabled ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 2500 },
  })

  const { data: pendingRewards } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'pendingRewards',
    args: enabled ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 2500 },
  })

  const { data: multiplier } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'getMultiplier',
    args: enabled ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 6000 },
  })

  const stakedAmount = (userInfo?.[0] ?? 0n) as bigint

  const fmt = (v?: bigint) => (v ? Number(formatUnits(v, decimals)) : 0)
  const fmtInt = (v?: bigint) => (v ? Number(v.toString()) : 0)

  const tokenBalNum = useMemo(() => fmt(tokenBal as bigint), [tokenBal, decimals])
  const stakedNum = useMemo(() => fmt(stakedAmount), [stakedAmount, decimals])
  const pendingBaseNum = useMemo(() => fmt(pendingBase as bigint), [pendingBase, decimals])
  const pendingRewardsNum = useMemo(() => fmt(pendingRewards as bigint), [pendingRewards, decimals])
  const nftCountNum = useMemo(() => fmtInt(nftBal as bigint), [nftBal])

  const pendingBaseAnim = useAnimatedNumber(pendingBaseNum, 650)
  const pendingRewardsAnim = useAnimatedNumber(pendingRewardsNum, 650)

  const multiplierHuman = useMemo(() => {
    const m = Number(multiplier ?? 0n)
    if (!m) return '—'
    return `${(m / 10000).toFixed(2)}x (${m})`
  }, [multiplier])

  const hasAllowance = useMemo(() => {
    try {
      const need = parseUnits(stakeAmt || '0', decimals)
      return ((allowance ?? 0n) as bigint) >= need
    } catch {
      return false
    }
  }, [allowance, stakeAmt, decimals])

  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract()
  const { isLoading: isMining } = useWaitForTransactionReceipt({ hash: txHash })
  const busy = isWriting || isMining

  const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1)

  function approveMax() {
    writeContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [STAKING_ADDRESS as `0x${string}`, MAX_UINT256],
    })
  }

  function stake() {
    const amt = parseUnits(stakeAmt || '0', decimals)
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: 'stake',
      args: [amt],
    })
  }

  function unstake() {
    const amt = parseUnits(unstakeAmt || '0', decimals)
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: 'unstake',
      args: [amt],
    })
  }

  function claim() {
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: 'claim',
      args: [],
    })
  }

  const shortAddr =
    typeof address === 'string' ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'

  return (
    <main style={{ minHeight: '100vh', background: '#0b0f19', color: 'white' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '26px 20px 70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.5 }}>🔥 NFT Boost Staking Dashboard</div>
            <div style={{ opacity: 0.72, marginTop: 6, fontSize: 13 }}>
              <span style={{ opacity: 0.9 }}>Network:</span>{' '}
              <b style={{ color: isRightNetwork ? '#22c55e' : '#f97316' }}>
                {isRightNetwork ? 'Robinhood Chain Testnet' : `Wrong network (chainId ${chainId})`}
              </b>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link
              href="/"
              style={{
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                fontWeight: 800,
                padding: '8px 10px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              ← Home
            </Link>

            {!isConnected ? (
              <Button disabled={isConnecting} onClick={() => connect({ connector: injected() })}>
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </Button>
            ) : !isRightNetwork ? (
              <Button
                disabled={isSwitching}
                onClick={() => switchChain({ chainId: REQUIRED_CHAIN_ID })}
              >
                {isSwitching ? 'Switching…' : 'Switch to Robinhood Testnet'}
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontWeight: 900 }}>{shortAddr}</div>
                <Button variant="ghost" onClick={() => disconnect()}>
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12, lineHeight: 1.6 }}>
          Token: <a style={{ color: 'white' }} href={`${EXPLORER_ADDR}${TOKEN_ADDRESS}`} target="_blank" rel="noreferrer">{TOKEN_ADDRESS}</a>
          <br />
          NFT: <a style={{ color: 'white' }} href={`${EXPLORER_ADDR}${NFT_ADDRESS}`} target="_blank" rel="noreferrer">{NFT_ADDRESS}</a>
          <br />
          Staking: <a style={{ color: 'white' }} href={`${EXPLORER_ADDR}${STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{STAKING_ADDRESS}</a>
        </div>

        {!isConnected && (
          <div style={{ marginTop: 18, borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
            Connect wallet untuk mulai. Setelah connect, kalau network salah, klik tombol switch.
          </div>
        )}

        {isConnected && !isRightNetwork && (
          <div style={{ marginTop: 18, borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
            Lu lagi di network yang salah. Klik <b>Switch to Robinhood Testnet</b>.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 18 }}>
          <Card title="Balances">
            <div>ERC20: <b>{tokenBalNum.toLocaleString(undefined, { maximumFractionDigits: 4 })}</b></div>
            <div style={{ marginTop: 8 }}>NFT count: <b>{nftCountNum.toLocaleString()}</b></div>
          </Card>

          <Card title="Staking">
            <div>Staked: <b>{stakedNum.toLocaleString(undefined, { maximumFractionDigits: 4 })}</b></div>
            <div style={{ marginTop: 8 }}>Multiplier: <b>{multiplierHuman}</b></div>
          </Card>

          <Card title="Rewards (live)">
            <div>Pending base: <b>{pendingBaseAnim.toLocaleString(undefined, { maximumFractionDigits: 6 })}</b></div>
            <div style={{ marginTop: 8 }}>Pending boosted: <b>{pendingRewardsAnim.toLocaleString(undefined, { maximumFractionDigits: 6 })}</b></div>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginTop: 14 }}>
          <Card title="Stake">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Input value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} placeholder="Amount" />
                <div style={{ opacity: 0.7, marginTop: 8, fontSize: 12 }}>
                  Tip: approve max sekali → stake berkali-kali.
                </div>
              </div>

              {!enabled ? (
                <Button disabled>Locked</Button>
              ) : !hasAllowance ? (
                <Button disabled={busy} onClick={approveMax}>
                  {busy ? 'Processing…' : 'Approve Max'}
                </Button>
              ) : (
                <Button disabled={busy} onClick={stake}>
                  {busy ? 'Processing…' : 'Stake'}
                </Button>
              )}
            </div>
          </Card>

          <Card title="Claim / Unstake">
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
              <Button disabled={!enabled || busy} onClick={claim}>
                {busy ? 'Processing…' : 'Claim'}
              </Button>

              {txHash && (
                <a
                  href={`${EXPLORER_TX}${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 800, textDecoration: 'none' }}
                >
                  View Tx ↗
                </a>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Input value={unstakeAmt} onChange={(e) => setUnstakeAmt(e.target.value)} placeholder="Amount" />
              </div>
              <Button disabled={!enabled || busy} onClick={unstake}>
                {busy ? 'Processing…' : 'Unstake'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}