import { createConfig, http } from 'wagmi'
import { defineChain } from 'viem'

export const robinhood = defineChain({
  id: 46630,
  name: 'Robinhood Testnet',
  nativeCurrency: {
    name: 'Robinhood',
    symbol: 'RH',
    decimals: 18,
  },
  rpcUrls: {
  default: { http: ['https://rpc.testnet.chain.robinhood.com'] },
},
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
})

export const config = createConfig({
  chains: [robinhood],
  transports: {
    [robinhood.id]: http(),
  },
})