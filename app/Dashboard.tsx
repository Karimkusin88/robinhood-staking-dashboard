'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import toast from 'react-hot-toast'
import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS } from '@/lib/constants'

const REQUIRED_CHAIN_ID = 46630
const REQUIRED_CHAIN_NAME = 'Robinhood Testnet'
const EXPLORER = 'https://explorer.testnet.rbhscan.io'

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

function shortAddr(a?: string) {
  if (!a) return '—'
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function copy(text: string) {
  navigator.clipboard.writeText(text)
  toast.success('Copied!')
}

function openExplorer(type: 'address' | 'tx', hash: string) {
  const url = type === 'tx' ? `${EXPLORER}/tx/${hash}` : `${EXPLORER}/address/${hash}`
  window.open(url, '_blank', 'noreferrer')
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
        padding: 16,
        background: 'white',
        boxShadow: '0 16px 40px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ fontWeight: 950, marginBottom: 10, letterSpacing: -0.2 }}>{title}</div>
      {children}
    </div>
  )
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const { disabled, variant = 'primary', style, ...rest } = props
  const bg =
    disabled
      ? 'rgba(0,0,0,0.06)'
      : variant === 'primary'
      ? 'black'
      : variant === 'danger'
      ? '#ef4444'
      : 'white'
  const fg = disabled ? 'rgba(0,0,0,0.45)' : variant === 'ghost' ? 'black' : 'white'
  const border = '1px solid rgba(0,0,0,0.12)'

  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        padding: '10px 12px',
        borderRadius: 12,
        border,
        background: bg,
        color: fg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 950,
        transition: 'transform .15s ease, box-shadow .15s ease',
        boxShadow: disabled ? 'none' : '0 10px 24px rgba(0,0,0,0.10)',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        ;(e.currentTarget.style.transform as any) = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget.style.transform as any) = 'translateY(0px)'
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
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.12)',
        outline: 'none',
      }}
    />
  )
}

/** Smooth number animation */
function useAnimatedNumber(target: number, durationMs = 600) {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const to = target
    if (!Number.isFinite(to)) return
    if (from === to) return

    const t0 = performance.now()
    const diff = to - from

    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs)
      const e = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setVal(from + diff * e)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, durationMs])

  return val
}

/** Demo mode data (when not connected) */
const DEMO = {
  wallet: '0xDEMO...BEEF',
  token: 12345.6789,
  nftCount: 1,
  staked: 10,
  multiplier: '1.10x (11000)',
  pendingBase: 0.042,
  pendingBoosted: 0.046,
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isRightNetwork = chainId === REQUIRED_CHAIN_ID
  const enabled = isConnected && typeof address === 'string' && isRightNetwork

  const [stakeAmt, setStakeAmt] = useState('10')
  const [unstakeAmt, setUnstakeAmt] = useState('1')

  const { data: decimalsData } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
  })
  const decimals = Number(decimalsData ?? 18)

  const { data: tokenBal } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: enabled ? [address!] : undefined,
    query: { enabled },
  })

  const { data: nftBal } = useReadContract({
    address: NFT_ADDRESS as `0x${string}`,
    abi: erc721Abi,
    functionName: 'balanceOf',
    args: enabled ? [address!] : undefined,
    query: { enabled },
  })

  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: enabled ? [address!, STAKING_ADDRESS as `0x${string}`] : undefined,
    query: { enabled },
  })

  const { data: userInfo } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'userInfo',
    args: enabled ? [address!] : undefined,
    query: { enabled },
  })

  const { data: pendingBase } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'pendingBase',
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 3000 },
  })

  const { data: pendingRewards } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'pendingRewards',
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 3000 },
  })

  const { data: multiplier } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'getMultiplier',
    args: enabled ? [address!] : undefined,
    query: { enabled },
  })

  const stakedAmount = (userInfo?.[0] ?? BigInt(0)) as bigint

  const fmtNum = (v?: bigint) => {
    try {
      return v ? Number(formatUnits(v, decimals)) : 0
    } catch {
      return 0
    }
  }

  const realToken = useMemo(() => fmtNum(tokenBal as bigint), [tokenBal, decimals])
  const realStaked = useMemo(() => fmtNum(stakedAmount), [stakedAmount, decimals])
  const realBase = useMemo(() => fmtNum(pendingBase as bigint), [pendingBase, decimals])
  const realBoosted = useMemo(() => fmtNum(pendingRewards as bigint), [pendingRewards, decimals])

  const multiplierHuman = useMemo(() => {
    const m = Number(multiplier ?? BigInt(0))
    if (!m) return '—'
    return `${(m / 10000).toFixed(2)}x (${m})`
  }, [multiplier])

  // Decide display values (demo mode if not enabled)
  const showDemo = !enabled
  const tokenNum = showDemo ? DEMO.token : realToken
  const stakedNum = showDemo ? DEMO.staked : realStaked
  const baseNum = showDemo ? DEMO.pendingBase : realBase
  const boostedNum = showDemo ? DEMO.pendingBoosted : realBoosted
  const nftCount = showDemo ? DEMO.nftCount : Number((nftBal ?? BigInt(0)).toString())

  // Animated display numbers
  const tokenAnim = useAnimatedNumber(tokenNum, 650)
  const stakedAnim = useAnimatedNumber(stakedNum, 650)
  const baseAnim = useAnimatedNumber(baseNum, 650)
  const boostedAnim = useAnimatedNumber(boostedNum, 650)

  const hasAllowance = useMemo(() => {
    try {
      const need = parseUnits(stakeAmt || '0', decimals)
      return ((allowance ?? BigInt(0)) as bigint) >= need
    } catch {
      return false
    }
  }, [allowance, stakeAmt, decimals])

  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract()
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  const busy = isWriting || isMining

  const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1)

  // Toast lifecycle for tx
  const lastHashRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (txHash && txHash !== lastHashRef.current) {
      lastHashRef.current = txHash
      toast.success('Tx sent ✅')
    }
  }, [txHash])

  useEffect(() => {
    if (isSuccess && txHash) toast.success('Tx confirmed 🎉')
  }, [isSuccess, txHash])

  function approveMax() {
    if (!enabled) return toast.error('Connect wallet + switch network dulu bro')
    toast('Approving max…')
    writeContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [STAKING_ADDRESS as `0x${string}`, MAX_UINT256],
    })
  }

  function stake() {
    if (!enabled) return toast.error('Connect wallet + switch network dulu bro')
    try {
      const amt = parseUnits(stakeAmt || '0', decimals)
      toast('Staking…')
      writeContract({
        address: STAKING_ADDRESS as `0x${string}`,
        abi: stakingAbi,
        functionName: 'stake',
        args: [amt],
      })
    } catch {
      toast.error('Invalid stake amount')
    }
  }

  function unstake() {
    if (!enabled) return toast.error('Connect wallet + switch network dulu bro')
    try {
      const amt = parseUnits(unstakeAmt || '0', decimals)
      toast('Unstaking…')
      writeContract({
        address: STAKING_ADDRESS as `0x${string}`,
        abi: stakingAbi,
        functionName: 'unstake',
        args: [amt],
      })
    } catch {
      toast.error('Invalid unstake amount')
    }
  }

  function claim() {
    if (!enabled) return toast.error('Connect wallet + switch network dulu bro')
    toast('Claiming…')
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: 'claim',
      args: [],
    })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 600px at 20% 10%, rgba(0,0,0,0.06), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(0,0,0,0.05), transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.03), transparent 40%)',
        padding: 28,
        fontFamily: 'ui-sans-serif, system-ui',
      }}
    >
      <style>{`
        @keyframes slideUp { 0%{ opacity:0; transform: translateY(12px)} 100%{ opacity:1; transform: translateY(0)} }
        @keyframes pulse { 0%{ opacity:.35 } 50%{ opacity:.95 } 100%{ opacity:.35 } }
        .badge { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; border:1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.75); }
        .dot { width:8px; height:8px; border-radius:999px; background:#22c55e; animation:pulse 1.8s ease-in-out infinite; }
        .muted { opacity:.7; }
        .row { display:flex; justify-content:space-between; gap:10px; align-items:baseline; }
        .miniBtn { padding:6px 10px; border-radius:999px; border:1px solid rgba(0,0,0,0.12); background:white; cursor:pointer; font-weight:900; }
        .miniBtn:hover { filter: brightness(.97); }
        code { font-size: 12px; }
      `}</style>

      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ animation: 'slideUp .45s ease both' as any }}>
            <div className="badge">
              <span className="dot" />
              <span style={{ fontWeight: 950, fontSize: 13 }}>
                Network:{' '}
                <b>{isRightNetwork ? REQUIRED_CHAIN_NAME : isConnected ? 'Wrong Network' : REQUIRED_CHAIN_NAME}</b>
                {isRightNetwork ? ' ✅' : ''}
                {showDemo ? ' • Demo mode' : ''}
              </span>
            </div>

            <div style={{ fontSize: 30, fontWeight: 950, letterSpacing: -0.6, marginTop: 10 }}>
              🔥 NFT Boost Staking Dashboard
            </div>

            <div className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>
              <div className="row" style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                <span>Token:</span>
                <code>{TOKEN_ADDRESS}</code>
                <button className="miniBtn" onClick={() => copy(TOKEN_ADDRESS)}>Copy</button>
                <button className="miniBtn" onClick={() => openExplorer('address', TOKEN_ADDRESS)}>Explorer</button>
              </div>

              <div className="row" style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                <span>NFT:</span>
                <code>{NFT_ADDRESS}</code>
                <button className="miniBtn" onClick={() => copy(NFT_ADDRESS)}>Copy</button>
                <button className="miniBtn" onClick={() => openExplorer('address', NFT_ADDRESS)}>Explorer</button>
              </div>

              <div className="row" style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                <span>Staking:</span>
                <code>{STAKING_ADDRESS}</code>
                <button className="miniBtn" onClick={() => copy(STAKING_ADDRESS)}>Copy</button>
                <button className="miniBtn" onClick={() => openExplorer('address', STAKING_ADDRESS)}>Explorer</button>
              </div>
            </div>
          </div>

          {!isConnected ? (
            <Button disabled={isConnecting} onClick={() => connect({ connector: injected() })}>
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </Button>
          ) : (
            <div style={{ textAlign: 'right', animation: 'slideUp .5s ease both' as any }}>
              <div style={{ fontWeight: 950 }}>{shortAddr(address)}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => disconnect()}>
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </div>

        {isConnected && !isRightNetwork && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              border: '1px solid rgba(255,0,0,0.25)',
              background: 'rgba(255,0,0,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              animation: 'slideUp .5s ease both' as any,
            }}
          >
            <div>
              <div style={{ fontWeight: 950 }}>⚠️ Wrong network</div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>
                Switch to <b>{REQUIRED_CHAIN_NAME}</b> (chainId {REQUIRED_CHAIN_ID})
              </div>
            </div>

            <Button
              disabled={isSwitching}
              onClick={() => switchChain({ chainId: REQUIRED_CHAIN_ID })}
              style={{ whiteSpace: 'nowrap' }}
            >
              {isSwitching ? 'Switching…' : 'Switch Network'}
            </Button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 18 }}>
          <Card title="Balances">
            <div className="row">
              <span>ERC20</span>
              <b>{tokenAnim.toLocaleString(undefined, { maximumFractionDigits: 6 })}</b>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span>NFT count</span>
              <b>{nftCount}</b>
            </div>
          </Card>

          <Card title="Staking">
            <div className="row">
              <span>Staked</span>
              <b>{stakedAnim.toLocaleString(undefined, { maximumFractionDigits: 6 })}</b>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span>Multiplier</span>
              <b>{showDemo ? DEMO.multiplier : multiplierHuman}</b>
            </div>
          </Card>

          <Card title="Rewards (smooth)">
            <div className="row">
              <span>Pending base</span>
              <b>{baseAnim.toLocaleString(undefined, { maximumFractionDigits: 6 })}</b>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span>Pending boosted</span>
              <b>{boostedAnim.toLocaleString(undefined, { maximumFractionDigits: 6 })}</b>
            </div>
            <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
              Auto refresh ~3s + animated counters (no “loncat”).
            </div>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginTop: 14 }}>
          <Card title="Stake">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Input value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} placeholder="Amount" />
              </div>

              {!hasAllowance ? (
                <Button disabled={!enabled || busy} onClick={approveMax}>
                  {busy ? 'Processing…' : 'Approve (max)'}
                </Button>
              ) : (
                <Button disabled={!enabled || busy} onClick={stake}>
                  {busy ? 'Processing…' : 'Stake'}
                </Button>
              )}
            </div>

            <div style={{ opacity: 0.75, marginTop: 10, fontSize: 12 }}>
              Approve sekali, lalu stake berkali-kali.
            </div>
          </Card>

          <Card title="Claim / Unstake">
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button disabled={!enabled || busy} onClick={claim}>
                {busy ? 'Processing…' : 'Claim'}
              </Button>

              {txHash && (
                <>
                  <Button variant="ghost" onClick={() => openExplorer('tx', txHash)} style={{ fontWeight: 950 }}>
                    View Tx
                  </Button>
                  <Button variant="ghost" onClick={() => copy(txHash)} style={{ fontWeight: 950 }}>
                    Copy TxHash
                  </Button>
                </>
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

            {txHash && (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                Tx:{' '}
                <a
                  href={`${EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontWeight: 950 }}
                >
                  {txHash.slice(0, 10)}…{txHash.slice(-8)}
                </a>
              </div>
            )}
          </Card>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          <Card title="How it works">
            <div style={{ opacity: 0.8, lineHeight: 1.65, fontSize: 13 }}>
              1) Approve token → 2) Stake → 3) Rewards accumulate → 4) Claim → 5) Hold NFT to boost multiplier.
            </div>
          </Card>

          <Card title="Public demo checklist">
            <div style={{ opacity: 0.8, lineHeight: 1.75, fontSize: 13 }}>
              ✅ Landing page proper<br />
              ✅ /dashboard route<br />
              ✅ Network guard + switch<br />
              ✅ Tx hash explorer link<br />
              ✅ Smooth animated rewards
            </div>
          </Card>

          <Card title="Links">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="miniBtn" onClick={() => openExplorer('address', STAKING_ADDRESS)}>
                Staking explorer
              </button>
              <button className="miniBtn" onClick={() => openExplorer('address', TOKEN_ADDRESS)}>
                Token explorer
              </button>
              <button className="miniBtn" onClick={() => openExplorer('address', NFT_ADDRESS)}>
                NFT explorer
              </button>
            </div>
            <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
              Built by @{`Karimkusin88`} • {REQUIRED_CHAIN_NAME}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 18, opacity: 0.55, fontSize: 12 }}>
          Demo dApp • {REQUIRED_CHAIN_NAME} • Rewards auto refresh + smooth UI • Explorer links enabled
        </div>
      </div>
    </div>
  )
}