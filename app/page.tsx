export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 28,
        fontFamily: 'ui-sans-serif, system-ui',
        background:
          'radial-gradient(1200px 700px at 20% 0%, rgba(0,200,120,0.22), transparent 55%), radial-gradient(900px 600px at 90% 10%, rgba(0,170,255,0.18), transparent 50%), #0b0f14',
        color: 'white',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(0,200,120,1), rgba(0,170,255,1))',
                boxShadow: '0 10px 35px rgba(0,200,120,0.25)',
              }}
            />
            <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>Robinhood Testnet</div>
          </div>

          <a
            href="/dashboard"
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(0,200,120,1), rgba(0,170,255,1))',
              color: 'black',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Open Dashboard →
          </a>
        </div>

        <div style={{ marginTop: 70, maxWidth: 760 }}>
          <div style={{ fontSize: 48, fontWeight: 950, lineHeight: 1.05 }}>
            NFT-Boosted Staking
            <br />
            on <span style={{ color: 'rgba(0,200,120,1)' }}>Robinhood Testnet</span>
          </div>

          <div style={{ marginTop: 14, opacity: 0.85, lineHeight: 1.6 }}>
            Stake ERC20, claim rewards, and get boosted yield when you hold the NFT.
            Built fully on-chain & verified.
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            <a
              href="/dashboard"
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                background: 'white',
                color: 'black',
                fontWeight: 900,
                textDecoration: 'none',
              }}
            >
              Launch Dashboard
            </a>

            <a
              href="https://explorer.testnet.chain.robinhood.com"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'white',
                fontWeight: 800,
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              Open Explorer ↗
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}