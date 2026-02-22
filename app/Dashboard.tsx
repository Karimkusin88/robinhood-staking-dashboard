'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { injected } from 'wagmi/connectors'
import { formatUnits, parseAbi, parseUnits } from 'viem'
import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS } from '@/lib/constants'
import { robinhoodTestnet } from '@/lib/wagmi'

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

const EXPLORER = 'https://explorer.testnet.chain.robinhood.com'

function shortAddr(a?: string) {
  if (!a) return '—'
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10, letterSpacing: 0.2 }}>{title}</div>
      {children}
    </div>
  )
}

function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' }) {
  const { disabled, variant = 'solid', ...rest } = props
  const solid = variant === 'solid'
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        padding: '10px 12px',
        borderRadius: 14,
        border: solid ? '0' : '1px solid rgba(255,255,255,0.18)',
        background: disabled
          ? 'rgba(255,255,255,0.08)'
          : solid
            ? 'linear-gradient(135deg, rgba(0,200,120,1), rgba(0,170,255,1))'
            : 'rgba(255,255,255,0.06)',
        color: solid ? 'black' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 900,
      }}
    />
  )
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(0,0,0,0.25)',
        color: 'white',
        outline: 'none',
      }}
    />
  )
}

// super simple “smooth number” (no lib)
function useSmoothNumber(target: number, speed = 0.18) {
  const [v, setV] = useState(target)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
    const step = () => {
      setV((cur) => {
        const next = cur + (target - cur) * speed
        if (Math.abs(target - next) < 0.000001) return target
        return next
      })
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, speed])

  return v
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isRightNetwork = chainId === robinhoodTestnet.id
  const enabled = Boolean(isConnected && address && isRightNetwork)

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
    args: enabled ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 6000 },
  })

  const { data: nftBal } = useReadContract({
    address: NFT_ADDRESS as `0x${string}`,
    abi: erc721Abi,
    functionName: 'balanceOf',
    args: enabled ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 6000 },
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

  const fmt = (v?: bigint) => (v ? formatUnits(v, decimals) : '0')
  const fmtNum = (v?: bigint) => {
    try {
      return Number(fmt(v))
    } catch {
      return 0
    }
  }

  const tokenBalNum = fmtNum(tokenBal as bigint)
  const stakedNum = fmtNum(stakedAmount)
  const pendingBaseNum = fmtNum(pendingBase as bigint)
  const pendingBoostNum = fmtNum(pendingRewards as bigint)

  const pendingBaseSmooth = useSmoothNumber(pendingBaseNum)
  const pendingBoostSmooth = useSmoothNumber(pendingBoostNum)

  const multiplierText = useMemo(() => {
    const m = Number((multiplier ?? 0n) as bigint)
    if (!m) return '—'
    const x = (m / 10000).toFixed(2)
    return `${x}x (${m})`
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

  const MAX_UINT256 = (1n << 256n) - 1n

  const approveMax = () => {
    writeContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [STAKING_ADDRESS as `0x${string}`, MAX_UINT256],
    })
  }

  const stake = () => {
    const amt = parseUnits(stakeAmt || '0', decimals)
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: 'stake',
      args: [amt],
    })
  }

  const unstake = () => {
    const amt = parseUnits(unstakeAmt || '0', decimals)
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: 'unstake',
      args: [amt],
    })
  }

  const claim = () => {
    writeContract({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: stakingAbi,
      functionName: 'claim',
      args: [],
    })
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 28,
        fontFamily: 'ui-sans-serif, system-ui',
        background:
          'radial-gradient(1200px 700px at 20% 0%, rgba(0,200,120,0.22), transparent 55%), radial-gradient(900px 600px at 90% 10%, rgba(0,170,255,0.18), transparent 50%), #0b0f14',
        color: 'white',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(0,200,120,1), rgba(0,170,255,1))',
                  boxShadow: '0 10px 35px rgba(0,200,120,0.25)',
                }}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: 0.2 }}>
                  NFT Boost Staking Dashboard
                </div>
                <div style={{ opacity: 0.75, marginTop: 2, fontSize: 12 }}>
                  Network: <b>{isRightNetwork ? 'Robinhood Testnet' : `Wrong network (chainId ${chainId})`}</b>
                </div>
              </div>
            </div>
          </div>

          {!isConnected ? (
            <Btn disabled={isConnecting} onClick={() => connect({ connector: injected() })}>
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </Btn>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {!isRightNetwork ? (
                <Btn
                  disabled={isSwitching}
                  onClick={() => switchChain({ chainId: robinhoodTestnet.id })}
                >
                  {isSwitching ? 'Switching…' : 'Switch to Robinhood Testnet'}
                </Btn>
              ) : (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.06)',
                    fontWeight: 900,
                  }}
                >
                  {shortAddr(address)}
                </div>
              )}

              <Btn variant="ghost" onClick={() => disconnect()}>
                Disconnect
              </Btn>
            </div>
          )}
        </div>

        {/* guard */}
        {isConnected && !isRightNetwork && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 16,
              border: '1px solid rgba(255,80,80,0.30)',
              background: 'rgba(255,80,80,0.08)',
              lineHeight: 1.5,
              fontWeight: 800,
            }}
          >
            Wrong network bro. Klik tombol <b>Switch to Robinhood Testnet</b> biar dashboard jalan.
          </div>
        )}

        {/* cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 14,
            marginTop: 18,
          }}
        >
          <Card title="Balances">
            <div style={{ opacity: 0.8, fontSize: 12 }}>ERC20</div>
            <div style={{ fontSize: 20, fontWeight: 950 }}>{tokenBalNum.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            <div style={{ marginTop: 10, opacity: 0.85 }}>
              NFT count: <b>{(nftBal ?? 0n).toString()}</b>
            </div>
          </Card>

          <Card title="Staking">
            <div style={{ opacity: 0.8, fontSize: 12 }}>Staked</div>
            <div style={{ fontSize: 20, fontWeight: 950 }}>{stakedNum.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            <div style={{ marginTop: 10, opacity: 0.85 }}>
              Multiplier: <b>{multiplierText}</b>
            </div>
          </Card>

          <Card title="Rewards (Smooth)">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>Pending base</div>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  {pendingBaseSmooth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>Pending boosted</div>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  {pendingBoostSmooth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 14,
            marginTop: 14,
          }}
        >
          <Card title="Stake">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Inp value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} placeholder="Amount" />
              </div>
              {!hasAllowance ? (
                <Btn disabled={!enabled || busy} onClick={approveMax}>
                  {busy ? 'Processing…' : 'Approve Max'}
                </Btn>
              ) : (
                <Btn disabled={!enabled || busy} onClick={stake}>
                  {busy ? 'Processing…' : 'Stake'}
                </Btn>
              )}
            </div>

            <div style={{ opacity: 0.75, marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
              Tip: <b>Approve Max</b> sekali, habis itu stake berkali-kali.
            </div>
          </Card>

          <Card title="Claim / Unstake">
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
              <Btn disabled={!enabled || busy} onClick={claim}>
                {busy ? 'Processing…' : 'Claim'}
              </Btn>

              {txHash && (
                <a
                  href={`${EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'rgba(0,200,120,1)', fontWeight: 900, textDecoration: 'none' }}
                >
                  View Tx ↗
                </a>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Inp value={unstakeAmt} onChange={(e) => setUnstakeAmt(e.target.value)} placeholder="Amount" />
              </div>
              <Btn disabled={!enabled || busy} onClick={unstake}>
                {busy ? 'Processing…' : 'Unstake'}
              </Btn>
            </div>
          </Card>
        </div>

        {/* footer */}
        <div
          style={{
            marginTop: 18,
            opacity: 0.75,
            fontSize: 12,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>Token: <code>{TOKEN_ADDRESS}</code></span>
          <span>NFT: <code>{NFT_ADDRESS}</code></span>
          <span>Staking: <code>{STAKING_ADDRESS}</code></span>
        </div>
      </div>
    </main>
  )
}