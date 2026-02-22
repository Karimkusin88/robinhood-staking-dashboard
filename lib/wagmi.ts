import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const robinhoodTestnet = {
  id: 46630,
  name: "Robinhood Testnet",
  nativeCurrency: { name: "RBH", symbol: "RBH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
} as const;

export const config = createConfig({
  chains: [robinhoodTestnet],
  transports: {
    [robinhoodTestnet.id]: http(robinhoodTestnet.rpcUrls.default.http[0]),
  },
  connectors: [injected()],
  ssr: true,
});
