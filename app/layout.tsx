import Providers from './providers'

export const metadata = {
  title: 'NFT Boost Staking Dashboard',
  description: 'Robinhood testnet demo',
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