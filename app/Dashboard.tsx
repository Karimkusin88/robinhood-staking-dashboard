'use client'

import { useMemo, useState } from 'react'
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 16,
        padding: 16,
        background: 'white',
        boxShadow: '0 10px 26px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10, letterSpacing: -0.2 }}>{title}</div>
      {children}
    </div>
  )
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const { disabled, variant = 'primary', style, ...rest } = props
  const isPrimary = variant === 'primary'
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        padding: '10px 12px',
        borderRadius: 12,
        border: isPrimary ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(0,0,0,0.12)',
        background: disabled ? 'rgba(0,0,0,0.06)' : isPrimary ? 'black' : 'white',
        color: disabled ? 'rgba(0,0,0,0.45)' : isPrimary ? 'white' : 'black',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 900,
        ...style,
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

function shortAddr(a?: string) {
  if (!a) return '—'
  return `${a.slice(0, 6)}…${a.slice(-4)}`
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

  const fmt = (v?: bigint) => {
    try {
      return v ? Number(formatUnits(v, decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0'
    } catch {
      return '0'
    }
  }

  const tokenBalHuman = useMemo(() => fmt(tokenBal as bigint), [tokenBal, decimals])
  const stakedHuman = useMemo(() => fmt(stakedAmount), [stakedAmount, decimals])
  const pendingBaseHuman = useMemo(() => fmt(pendingBase as bigint), [pendingBase, decimals])
  const pendingRewardsHuman = useMemo(() => fmt(pendingRewards as bigint), [pendingRewards, decimals])

  const multiplierHuman = useMemo(() => {
    const m = Number(multiplier ?? BigInt(0))
    if (!m) return '—'
    return `${(m / 10000).toFixed(2)}x (${m})`
  }, [multiplier])

  const hasAllowance = useMemo(() => {
    try {
      const need = parseUnits(stakeAmt || '0', decimals)
      return ((allowance ?? BigInt(0)) as bigint) >= need
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.0))',
        padding: 28,
        fontFamily: 'ui-sans-serif, system-ui',
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 950, letterSpacing: -0.6 }}>
              🔥 NFT Boost Staking Dashboard
            </div>
            <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
              Token: <code>{TOKEN_ADDRESS}</code>
              <br />
              NFT: <code>{NFT_ADDRESS}</code>
              <br />
              Staking: <code>{STAKING_ADDRESS}</code>
            </div>
          </div>

          {!isConnected ? (
            <Button disabled={isConnecting} onClick={() => connect({ connector: injected() })}>
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </Button>
          ) : (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900 }}>{shortAddr(address)}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ERC20</span> <b>{enabled ? tokenBalHuman : '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span>NFT count</span> <b>{enabled ? (nftBal ?? BigInt(0)).toString() : '—'}</b>
            </div>
          </Card>

          <Card title="Staking">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Staked</span> <b>{enabled ? stakedHuman : '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span>Multiplier</span> <b>{enabled ? multiplierHuman : '—'}</b>
            </div>
          </Card>

          <Card title="Rewards">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Pending base</span> <b>{enabled ? pendingBaseHuman : '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span>Pending boosted</span> <b>{enabled ? pendingRewardsHuman : '—'}</b>
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
                  {busy ? 'Processing…' : 'Approve'}
                </Button>
              ) : (
                <Button disabled={!enabled || busy} onClick={stake}>
                  {busy ? 'Processing…' : 'Stake'}
                </Button>
              )}
            </div>

            <div style={{ opacity: 0.75, marginTop: 10, fontSize: 12 }}>
              Tip: approve sekali (max), lalu stake berkali-kali.
            </div>
          </Card>

          <Card title="Claim / Unstake">
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <Button disabled={!enabled || busy} onClick={claim}>
                {busy ? 'Processing…' : 'Claim'}
              </Button>
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
                  style={{ fontWeight: 900 }}
                >
                  {txHash.slice(0, 10)}…{txHash.slice(-8)}
                </a>
              </div>
            )}
          </Card>
        </div>

        <div style={{ marginTop: 16, opacity: 0.65, fontSize: 12 }}>
          Demo dApp • Robinhood Testnet • Built by @{`Karimkusin88`}
        </div>
      </div>
    </div>
  )
}