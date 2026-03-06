import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

export const robinhoodTestnet = {
  id: 46630,
  name: "Robinhood Testnet",
  nativeCurrency: { name: "RBH", symbol: "RBH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" },
  },
} as const;

export const config = getDefaultConfig({
  appName: "Robinhood Staking",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "demo",
  chains: [robinhoodTestnet],
  transports: {
    [robinhoodTestnet.id]: http(),
  },
  ssr: true,
});
