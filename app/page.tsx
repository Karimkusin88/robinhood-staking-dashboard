export default function Home() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 36, fontFamily: 'ui-sans-serif, system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -0.5 }}>
            🔥 Robinhood Testnet – NFT Boost Staking
          </div>
          <p style={{ marginTop: 10, opacity: 0.8, lineHeight: 1.6 }}>
            Demo dApp: ERC20 + NFT + NFT-boosted staking.
            <br />
            All contracts verified on-chain. Building in public.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <a
              href="/dashboard"
              style={{
                display: 'inline-block',
                padding: '12px 16px',
                borderRadius: 14,
                background: 'black',
                color: 'white',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Open Dashboard →
            </a>

            <a
              href="https://github.com/Karimkusin88/robinhood-staking-dashboard"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.15)',
                color: 'black',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              View GitHub
            </a>
          </div>
        </div>

        <div
          style={{
            width: 340,
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 18,
            padding: 16,
            background: 'white',
            boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Demo flow (1 minute)</div>
          <ol style={{ margin: 0, paddingLeft: 18, opacity: 0.85, lineHeight: 1.7 }}>
            <li>Connect wallet</li>
            <li>Approve token</li>
            <li>Stake 10</li>
            <li>Wait ~20s</li>
            <li>Claim rewards</li>
            <li>Hold NFT → multiplier increases</li>
          </ol>
        </div>
      </div>

      <div style={{ marginTop: 26, opacity: 0.7, fontSize: 12 }}>
        Tip: kalau link dashboard error “wrong network”, klik tombol switch di dashboard.
      </div>
    </main>
  )
}