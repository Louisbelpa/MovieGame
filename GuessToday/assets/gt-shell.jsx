/* GuessToday — layout shell helpers: WebNav, sidebar, stat bits. */

function GTWebNav({ active = 'hub', authed = true }) {
  const items = [
    { id: 'hub', label: 'Accueil' },
    { id: 'leader', label: 'Classement' },
    { id: 'friends', label: 'Amis' },
    { id: 'stats', label: 'Stats du jour' },
  ];
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', height: 68, borderBottom: '1px solid var(--gt-line)',
      background: 'var(--gt-bg-2)', position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <GTLogo size={22} />
        {authed && (
          <nav style={{ display: 'flex', gap: 4 }}>
            {items.map((it) => (
              <span key={it.id} style={{
                padding: '8px 14px', borderRadius: 'var(--gt-r-sm)', fontSize: 14.5, fontWeight: 500,
                color: it.id === active ? 'var(--gt-text)' : 'var(--gt-text-3)',
                background: it.id === active ? 'var(--gt-surface-2)' : 'transparent',
              }}>{it.label}</span>
            ))}
          </nav>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {authed ? (
          <>
            <GTStreak days={12} />
            <GTAvatar name="Léa Martin" size={36} hue={300} />
          </>
        ) : (
          <>
            <GTButton variant="ghost" size="sm">Se connecter</GTButton>
            <GTButton variant="primary" size="sm">Créer un compte</GTButton>
          </>
        )}
      </div>
    </header>
  );
}

/* small labelled stat */
function GTStat({ value, label, accent, mono = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div className={mono ? 'gt-mono' : ''} style={{ fontSize: 26, fontWeight: 700, color: accent || 'var(--gt-text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* section heading */
function GTSectionHead({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h2>
      {action && <span style={{ fontSize: 13.5, color: 'var(--gt-text-3)', fontWeight: 500 }}>{action}</span>}
    </div>
  );
}

/* horizontal bar (for distributions) */
function GTBar({ pct, accent, label, value, highlight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span className="gt-mono" style={{ width: 24, fontSize: 13, color: 'var(--gt-text-3)', textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, height: 26, background: 'var(--gt-surface)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 6,
          background: highlight ? (accent || 'var(--gt-brand)') : 'var(--gt-surface-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 28,
        }}>
          <span className="gt-mono" style={{ fontSize: 12, fontWeight: 600, color: highlight ? 'var(--gt-bg)' : 'var(--gt-text-2)' }}>{value}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GTWebNav, GTStat, GTSectionHead, GTBar });
