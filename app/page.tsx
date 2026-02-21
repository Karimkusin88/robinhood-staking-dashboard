export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 600px at 20% 10%, rgba(0,0,0,0.06), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(0,0,0,0.05), transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.03), transparent 40%)',
        padding: 36,
        fontFamily: 'ui-sans-serif, system-ui',
      }}
    >
      <style>{`
        @keyframes floaty { 0%{ transform: translateY(0px)} 50%{ transform: translateY(-8px)} 100%{ transform: translateY(0px)} }
        @keyframes glow { 0%{ opacity:.35 } 50%{ opacity:.8 } 100%{ opacity:.35 } }
        @keyframes slideUp { 0%{ opacity:0; transform: translateY(14px)} 100%{ opacity:1; transform: translateY(0)} }
        .card { border:1px solid rgba(0,0,0,0.08); border-radius:18px; background:#fff; box-shadow:0 16px 40px rgba(0,0,0,0.06); }
        .btn { display:inline-block; padding:12px 16px; border-radius:14px; font-weight:900; text-decoration:none; transition: transform .15s ease, box-shadow .15s ease; }
        .btn:hover { transform: translateY(-1px); box-shadow:0 12px 30px rgba(0,0,0,0.12); }
        .pill { display:inline-flex; gap:8px; align-items:center; padding:8px 12px; border-radius:999px; border:1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.7); }
        .dot { width:8px; height:8px; border-radius:999px; background: #22c55e; animation: glow 1.8s ease-in-out infinite; }
      `}</style>

      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 660, animation: 'slideUp .45s ease both' as any }}>
            <div className="pill" style={{ marginBottom: 14 }}>
              <span className="dot" />
              <span style={{ fontWeight: 900, fontSize: 13 }}>
                Live on <b>Robinhood Testnet</b>
              </span>
            </div>

            <div style={{ fontSize: 46, fontWeight: 950, letterSpacing: -1.2, lineHeight: 1.05 }}>
              🔥 NFT Boost Staking
              <br />
              Public Demo Dashboard
            </div>

            <p style={{ marginTop: 14, opacity: 0.82, lineHeight: 1.7, fontSize: 15 }}>
              ERC20 staking + NFT multiplier boost on Robinhood testnet.
              <br />
              Connect wallet, approve, stake, claim — with smooth animated rewards + explorer links.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <a className="btn" href="/dashboard" style={{ background: 'black', color: 'white' }}>
                Open Dashboard →
              </a>

              <a
                className="btn"
                href="https://github.com/Karimkusin88/robinhood-staking-dashboard"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'white',
                  color: 'black',
                  border: '1px solid rgba(0,0,0,0.12)',
                }}
              >
                View GitHub
              </a>
            </div>

            <div style={{ marginTop: 16, opacity: 0.65, fontSize: 12 }}>
              Tip: dashboard punya network guard + tombol switch ke Robinhood Testnet.
            </div>
          </div>

          <div
            className="card"
            style={{
              width: 370,
              padding: 18,
              animation: 'floaty 3.4s ease-in-out infinite' as any,
            }}
          >
            <div style={{ fontWeight: 950, marginBottom: 10 }}>⚡ 60-second demo</div>
            <ol style={{ margin: 0, paddingLeft: 18, opacity: 0.86, lineHeight: 1.85 }}>
              <li>Connect wallet</li>
              <li>Switch to Robinhood Testnet</li>
              <li>Approve token (max)</li>
              <li>Stake 10</li>
              <li>Wait a bit</li>
              <li>Claim rewards</li>
              <li>Hold NFT → boost</li>
            </ol>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(0,0,0,0.02)',
                fontSize: 12,
                opacity: 0.82,
                lineHeight: 1.5,
              }}
            >
              <b>Demo ready</b> — reward auto refresh + smooth animation + tx link to explorer.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          {[
            { t: 'On-chain verified', d: 'Contracts verified di explorer, transparan.' },
            { t: 'NFT boosts', d: 'Multiplier naik otomatis kalau wallet pegang NFT.' },
            { t: 'Better UX', d: 'Approve / Stake / Claim + toast notif + tx link.' },
          ].map((x, i) => (
            <div
              key={x.t}
              className="card"
              style={{
                padding: 16,
                animation: 'slideUp .55s ease both' as any,
                animationDelay: `${120 + i * 90}ms`,
              }}
            >
              <div style={{ fontWeight: 950 }}>{x.t}</div>
              <div style={{ marginTop: 8, opacity: 0.75, lineHeight: 1.55 }}>{x.d}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, opacity: 0.55, fontSize: 12 }}>
          Built by @{`Karimkusin88`} • Robinhood testnet • build-in-public
        </div>
      </div>
    </main>
  )
}