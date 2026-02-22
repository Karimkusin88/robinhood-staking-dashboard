"use client";

import { useAccount } from "wagmi";

export default function DashboardClient() {
  const { address, isConnected } = useAccount();

  return (
    <main style={{ padding: 24 }}>
      <h1>NFT Boost Staking Dashboard</h1>
      <div style={{ marginTop: 12 }}>
        {isConnected ? <div>Connected: {address}</div> : <div>Not connected</div>}
      </div>
    </main>
  );
}
