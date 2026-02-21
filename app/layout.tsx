import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import Providers from './providers'
...
<body>
  <Providers>{children}</Providers>
  <Toaster ... />
</body>

export const metadata: Metadata = {
  title: 'Robinhood Testnet • NFT Boost Staking',
  description: 'ERC20 + NFT boosted staking dashboard demo on Robinhood testnet.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: 14,
              fontWeight: 800,
            },
          }}
        />
      </body>
    </html>
  )
}