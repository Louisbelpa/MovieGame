/* GuessToday — Mobile WEB (responsive site, not native). Browser chrome + hamburger nav. */

/* Mobile browser frame — thin chrome with URL bar, content below at natural height. */
function MWFrame({ children, url = 'guesstoday.app' }) {
  return (
    <div style={{ width: 390, background: 'var(--gt-bg)', borderRadius: 'var(--gt-r-lg)', overflow: 'hidden', border: '1px solid var(--gt-line)', boxShadow: 'var(--gt-shadow)' }}>
      {/* browser chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#000', borderBottom: '1px solid var(--gt-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-pill)', padding: '7px 14px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
          <span className="gt-mono" style={{ fontSize: 12.5, color: 'var(--gt-text-2)' }}>{url}</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2" strokeLinecap="round"><path d="M4 12a8 8 0 018-8 8 8 0 017 4M20 4v4h-4"/><path d="M20 12a8 8 0 01-8 8 8 8 0 01-7-4M4 20v-4h4"/></svg>
      </div>
      {children}
    </div>
  );
}

/* Site header (sticky-look) with hamburger */
function MWHeader({ menuOpen }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--gt-line)', background: 'var(--gt-bg-2)', position: 'relative', zIndex: 30 }}>
      <GTLogo size={19} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <GTStreak days={12} />
        <button style={{ width: 38, height: 38, borderRadius: 'var(--gt-r-sm)', border: '1px solid var(--gt-line-2)', background: 'var(--gt-surface)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text)" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text)" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          )}
        </button>
      </div>
    </header>
  );
}

/* Logged-out header */
function MWHeaderGuest() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--gt-line)', background: 'var(--gt-bg-2)' }}>
      <GTLogo size={19} />
      <GTButton variant="primary" size="sm">S'inscrire</GTButton>
    </header>
  );
}

/* Slide-in nav drawer (one state shows it open) */
function MWDrawer() {
  const items = [
    { label: 'Accueil', active: true, icon: '◆' },
    { label: 'Classement', icon: '★' },
    { label: 'Amis', icon: '◎' },
    { label: 'Stats du jour', icon: '▦' },
    { label: 'Mon profil', icon: '◐' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <nav style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 264, background: 'var(--gt-bg-2)', borderLeft: '1px solid var(--gt-line)', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 6, animation: 'gt-rise .3s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px 16px', borderBottom: '1px solid var(--gt-line)', marginBottom: 8 }}>
          <GTAvatar name="Léa Martin" size={40} hue={300} />
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>Léa Martin</div><div style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>@leamartin</div></div>
        </div>
        {items.map((it) => (
          <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 12px', borderRadius: 'var(--gt-r-md)', background: it.active ? 'var(--gt-surface-2)' : 'transparent', color: it.active ? 'var(--gt-text)' : 'var(--gt-text-2)', fontSize: 15.5, fontWeight: it.active ? 700 : 500 }}>
            <span style={{ width: 18, textAlign: 'center', color: it.active ? 'var(--gt-brand)' : 'var(--gt-text-4)' }}>{it.icon}</span>{it.label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <GTButton variant="soft" full>Se déconnecter</GTButton>
      </nav>
    </div>
  );
}

Object.assign(window, { MWFrame, MWHeader, MWHeaderGuest, MWDrawer });
