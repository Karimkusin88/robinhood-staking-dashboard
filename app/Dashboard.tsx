'use client'

import { useMemo, useState } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { injected } from 'wagmi/connectors'
import { formatUnits, parseAbi, parseUnits } from 'viem'
import { TOKEN_ADDRESS, NFT_ADDRESS, STAKING_ADDRESS } from '@/lib/constants'

const EXPLORER = 'https://explorer.testnet.chain.robinhood.com'

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

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    alert('Copied!')
  } catch {
    alert('Copy failed')
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 14,
        padding: 16,
        background: 'white',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { disabled } = props
  return (
    <button
      {...props}
      style={{
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.12)',
        background: disabled ? 'rgba(0,0,0,0.04)' : 'black',
        color: disabled ? 'rgba(0,0,0,0.45)' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
      }}
    />
  )
}

function LinkBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid rgba(0,0,0,0.12)',
        textDecoration: 'none',
        color: 'black',
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {label}
    </a>
  )
}

function MiniBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid rgba(0,0,0,0.12)',
        background: 'white',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {label}
    </button>
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

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()

  const [stakeAmt, setStakeAmt] = useState('10')
  const [unstakeAmt, setUnstakeAmt] = useState('1')

  const enabled = isConnected && typeof address === 'string'

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
    query: { enabled, refetchInterval: 5000 },
  })

  const { data: nftBal } = useReadContract({
    address: NFT_ADDRESS as `0x${string}`,
    abi: erc721Abi,
    functionName: 'balanceOf',
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 5000 },
  })

  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: enabled ? [address!, STAKING_ADDRESS as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 5000 },
  })

  const { data: userInfo } = useReadContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: stakingAbi,
    functionName: 'userInfo',
    args: enabled ? [address!] : undefined,
    query: { enabled, refetchInterval: 3000 },
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
    query: { enabled, refetchInterval: 5000 },
  })

  const stakedAmount = (userInfo?.[0] ?? 0n) as bigint

  const fmt = (v?: bigint) => (v ? formatUnits(v, decimals) : '0')
  const fmtInt = (v?: bigint) => (v ? v.toString() : '0')

  const tokenBalHuman = useMemo(() => fmt(tokenBal as bigint), [tokenBal, decimals])
  const stakedHuman = useMemo(() => fmt(stakedAmount), [stakedAmount, decimals])
  const pendingBaseHuman = useMemo(() => fmt(pendingBase as bigint), [pendingBase, decimals])
  const pendingRewardsHuman = useMemo(() => fmt(pendingRewards as bigint), [pendingRewards, decimals])
  const nftCountHuman = useMemo(() => fmtInt(nftBal as bigint), [nftBal])

  const multiplierHuman = useMemo(() => {
    const mBig = (multiplier ?? 0n) as bigint
    if (!mBig) return '—'
    const mStr = (Number(mBig) / 10000).toFixed(2) // 10000..15000 range
    return `${mStr}x (${mBig.toString()})`
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

  function approveMax() {
    writeContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [STAKING_ADDRESS as `0x${string}`, (2n ** 256n) - 1n],
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

  const shortAddress =
    typeof address === 'string' ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'

  const nftCountNum = useMemo(() => {
    try {
      return Number(nftBal ?? 0n)
    } catch {
      return 0
    }
  }, [nftBal])

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 28, fontFamily: 'ui-sans-serif, system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>🔥 NFT Boost Staking Dashboard</div>

          <div style={{ opacity: 0.8, marginTop: 10, lineHeight: 1.8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>
                Token: <code>{shortAddr(TOKEN_ADDRESS)}</code>
              </span>
              <MiniBtn onClick={() => copyToClipboard(TOKEN_ADDRESS)} label="Copy" />
              <LinkBtn href={`${EXPLORER}/token/${TOKEN_ADDRESS}`} label="Explorer" />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>
                NFT: <code>{shortAddr(NFT_ADDRESS)}</code>
              </span>
              <MiniBtn onClick={() => copyToClipboard(NFT_ADDRESS)} label="Copy" />
              <LinkBtn href={`${EXPLORER}/token/${NFT_ADDRESS}`} label="Explorer" />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>
                Staking V4: <code>{shortAddr(STAKING_ADDRESS)}</code>
              </span>
              <MiniBtn onClick={() => copyToClipboard(STAKING_ADDRESS)} label="Copy" />
              <LinkBtn href={`${EXPLORER}/address/${STAKING_ADDRESS}`} label="Explorer" />
            </div>
          </div>
        </div>

        {!isConnected ? (
          <Button disabled={isConnecting} onClick={() => connect({ connector: injected() })}>
            {isConnecting ? 'Connecting…' : 'Connect Wallet'}
          </Button>
        ) : (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{shortAddress}</div>
            <Button onClick={() => disconnect()}>Disconnect</Button>
          </div>
        )}
      </div>

      {enabled && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 18 }}>
            <Card title="Balances">
              <div>
                ERC20: <b>{tokenBalHuman}</b>
              </div>
              <div style={{ marginTop: 6 }}>
                NFT count: <b>{nftCountHuman}</b>
              </div>
            </Card>

            <Card title="Staking">
              <div>
                Staked: <b>{stakedHuman}</b>
              </div>
              <div style={{ marginTop: 6 }}>
                Multiplier: <b>{multiplierHuman}</b>
              </div>

              <div style={{ marginTop: 10 }}>
                {nftCountNum > 0 ? (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: '#eaffea',
                      border: '1px solid #b7ffb7',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    ✅ Boost Active
                  </span>
                ) : (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: '#fff3e6',
                      border: '1px solid #ffd2a6',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    ❌ No NFT Boost
                  </span>
                )}
              </div>
            </Card>

            <Card title="Rewards">
              <div>
                Pending base: <b>{pendingBaseHuman}</b>
              </div>
              <div style={{ marginTop: 6 }}>
                Pending boosted: <b>{pendingRewardsHuman}</b>
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
                  <Button disabled={busy} onClick={approveMax}>
                    {busy ? 'Processing…' : 'Approve'}
                  </Button>
                ) : (
                  <Button disabled={busy} onClick={stake}>
                    {busy ? 'Processing…' : 'Stake'}
                  </Button>
                )}
              </div>

              <div style={{ opacity: 0.7, marginTop: 10, fontSize: 12 }}>
                Tip: Approve sekali (max), habis itu stake berkali-kali.
              </div>
            </Card>

            <Card title="Claim / Unstake">
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Button disabled={busy} onClick={claim}>
                  {busy ? 'Processing…' : 'Claim'}
                </Button>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <Input value={unstakeAmt} onChange={(e) => setUnstakeAmt(e.target.value)} placeholder="Amount" />
                </div>
                <Button disabled={busy} onClick={unstake}>
                  {busy ? 'Processing…' : 'Unstake'}
                </Button>
              </div>

              {txHash && (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                  Tx: <code>{txHash}</code>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}