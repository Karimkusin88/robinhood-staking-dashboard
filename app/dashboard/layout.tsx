import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard • Robinhood Staking',
  description: 'Stake ERC20 + NFT boost on Robinhood Testnet',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}