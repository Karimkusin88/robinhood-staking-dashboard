import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#0b0f19', color: 'white' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '72px 20px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
            fontSize: 13,
            marginBottom: 22,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e', display: 'inline-block' }} />
          Robinhood Chain Testnet • NFT Boost Staking Demo
        </div>

        <h1 style={{ fontSize: 52, lineHeight: 1.05, margin: 0, fontWeight: 900, letterSpacing: -1 }}>
          Stake ERC20, boost with NFT.
          <br />
          Rewards update live.
        </h1>

        <p style={{ marginTop: 18, maxWidth: 720, fontSize: 18, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
          Demo dApp: ERC20 + NFT + NFT-boosted staking. Connect wallet, switch network to Robinhood Testnet, approve once,
          then stake/unstake/claim.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 14,
              background: 'white',
              color: 'black',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            🚀 Open Dashboard
          </Link>

          <a
            href="https://explorer.testnet.chain.robinhood.com"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            🔎 Explorer
          </a>
        </div>

        <div
          style={{
            marginTop: 44,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          {[
            ['ERC20', 'Approve once. Stake anytime.'],
            ['NFT Boost', 'Multiplier increases with NFT balance.'],
            ['On-chain', 'Contracts verified on explorer.'],
          ].map(([t, d]) => (
            <div
              key={t}
              style={{
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>{t}</div>
              <div style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}