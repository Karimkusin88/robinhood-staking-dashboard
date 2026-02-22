import type { Metadata } from 'next'
import Providers from '../providers'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}

export const metadata: Metadata = {
  title: 'Robinhood Staking Dashboard',
  description: 'NFT-boosted staking dashboard on Robinhood Testnet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}