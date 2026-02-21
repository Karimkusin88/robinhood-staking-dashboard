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

const erc721Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
])

const stakingAbi = parseAbi([
  'function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)',
  'function pendingBase(address) view returns (uint256)',
  'function pendingRewards(address) view returns (uint256)',
  'function getMultiplier(address) view returns (uint256)',
  'function stake(uint256)',
  'function unstake(uint256)',
  'function claim()',
])

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

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

  const fmt = (v?: bigint) =>
    v ? Number(formatUnits(v, decimals)).toLocaleString() : '0'

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

  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading: isMining } = useWaitForTransactionReceipt({ hash: txHash })

  const busy = isMining

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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 32 }}>
      <h1>🔥 NFT Boost Staking Dashboard</h1>

      {!isConnected ? (
        <button onClick={() => connect({ connector: injected() })}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <div>
            {address?.slice(0, 6)}...{address?.slice(-4)}
            <button onClick={() => disconnect()} style={{ marginLeft: 12 }}>
              Disconnect
            </button>
          </div>

          {!isRightNetwork && (
            <div style={{ marginTop: 12 }}>
              ⚠️ Wrong Network — Switch to {REQUIRED_CHAIN_NAME}
              <button
                onClick={() => switchChain({ chainId: REQUIRED_CHAIN_ID })}
                style={{ marginLeft: 10 }}
              >
                Switch
              </button>
            </div>
          )}

          <hr style={{ margin: '20px 0' }} />

          <div>ERC20 Balance: {tokenBalHuman}</div>
          <div>NFT Count: {(nftBal ?? BigInt(0)).toString()}</div>
          <div>Staked: {stakedHuman}</div>
          <div>Multiplier: {multiplierHuman}</div>
          <div>Pending Base: {pendingBaseHuman}</div>
          <div>Pending Boosted: {pendingRewardsHuman}</div>

          <hr style={{ margin: '20px 0' }} />

          <input
            value={stakeAmt}
            onChange={(e) => setStakeAmt(e.target.value)}
          />
          {!hasAllowance ? (
            <button onClick={approveMax} disabled={busy}>
              Approve
            </button>
          ) : (
            <button onClick={stake} disabled={busy}>
              Stake
            </button>
          )}

          <br /><br />

          <input
            value={unstakeAmt}
            onChange={(e) => setUnstakeAmt(e.target.value)}
          />
          <button onClick={unstake} disabled={busy}>
            Unstake
          </button>

          <br /><br />

          <button onClick={claim} disabled={busy}>
            Claim
          </button>

          {txHash && (
            <div style={{ marginTop: 10 }}>
              Tx:{' '}
              <a
                href={`${EXPLORER}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}