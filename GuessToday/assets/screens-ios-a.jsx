/* GuessToday — iOS mobile screens (part A): shell, onboarding, auth, hub, games.
   Renders GT dark-premium content inside the IOSDevice frame (dark mode). */

/* ---- Mobile shell: clears status bar + home indicator, GT dark bg ---- */
function GTMobileScreen({ children, pad = 20, bg = 'var(--gt-bg)', noTopPad }) {
  return (
    <div className="gt-root" style={{
      minHeight: '100%', background: bg, color: 'var(--gt-text)',
      padding: `${noTopPad ? 0 : 60}px ${pad}px 40px`,
    }}>{children}</div>
  );
}

/* ---- Mobile top bar (logo / greeting + streak + avatar) ---- */
function GTMobileBar({ greeting }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
      {greeting ? (
        <div>
          <div style={{ fontSize: 13, color: 'var(--gt-text-3)' }}>Mardi 28 mai · #142</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{greeting}</div>
        </div>
      ) : <GTLogo size={20} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <GTStreak days={12} />
        <GTAvatar name="Léa Martin" size={36} hue={300} />
      </div>
    </div>
  );
}

/* ---- Mobile game card (horizontal row, tap target ≥64px) ---- */
function GTMobileGameCard({ game, status = 'todo', attempts, total = 5, won }) {
  const m = GAME_META[game];
  const statusMap = {
    todo:    { label: 'Pas encore joué', tone: 'neutral' },
    progress:{ label: `Essai ${attempts}/${total}`, tone: 'warn' },
    done:    { label: won ? `Résolu en ${attempts}/${total}` : 'Non trouvé', tone: won ? 'success' : 'danger' },
  }[status];
  return (
    <div className={m.cls} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: 16,
      borderRadius: 'var(--gt-r-lg)', background: 'var(--gt-surface)',
      border: '1px solid var(--gt-line)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--acc)' }} />
      <div style={{
        width: 56, height: 56, flex: '0 0 auto', borderRadius: 'var(--gt-r-md)',
        background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center',
      }}>
        <GameGlyph game={m.glyph} size={30} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{m.name}</div>
        <div style={{ marginTop: 6 }}><GTBadge tone={statusMap.tone}>{statusMap.label}</GTBadge></div>
      </div>
      <div style={{
        width: 40, height: 40, flex: '0 0 auto', borderRadius: '50%',
        background: status === 'done' ? 'var(--gt-surface-2)' : 'var(--acc)',
        color: status === 'done' ? 'var(--gt-text-3)' : 'var(--gt-bg)',
        display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700,
      }}>{status === 'done' ? '↻' : '▶'}</div>
    </div>
  );
}

/* =======================  ONBOARDING (3 slides)  ======================= */
function IOSOnboarding({ slide = 0 }) {
  const slides = [
    { game: 'film', title: 'Un défi par jour', body: 'Trois jeux de devinettes, renouvelés chaque jour à minuit. Tout le monde joue le même défi.', glyph: 'film' },
    { game: 'serie', title: '5 essais, 3 indices', body: 'Devine le titre ou la personnalité. Bloqué ? Un indice se dévoile à chaque essai raté.', glyph: 'serie' },
    { game: 'face', title: 'Joue avec tes amis', body: 'Compare tes scores, grimpe au classement et partage ta journée en une seule carte.', glyph: 'face' },
  ];
  const s = slides[slide];
  const m = GAME_META[s.game];
  return (
    <IOSDevice dark>
      <GTMobileScreen pad={28}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <GTLogo size={20} />
          <span style={{ fontSize: 14, color: 'var(--gt-text-3)', fontWeight: 500 }}>Passer</span>
        </div>
        {/* hero visual */}
        <div className={m.cls} style={{
          height: 300, borderRadius: 'var(--gt-r-xl)', marginBottom: 36,
          background: 'radial-gradient(120% 90% at 50% 30%, var(--acc-dim), var(--gt-surface) 70%)',
          border: '1px solid var(--gt-line)', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .5 }}>
            {slides.map((sl, i) => {
              const mm = GAME_META[sl.game];
              const pos = [[18, 24], [70, 60], [40, 78]][i];
              return <span key={i} className={mm.cls} style={{ position: 'absolute', left: `${pos[0]}%`, top: `${pos[1]}%`, color: 'var(--acc)', opacity: i === slide ? 0 : .35 }}><GameGlyph game={mm.glyph} size={34} /></span>;
            })}
          </div>
          <div style={{ width: 110, height: 110, borderRadius: 28, background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center', position: 'relative' }}>
            <GameGlyph game={m.glyph} size={62} />
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', textAlign: 'center' }}>{s.title}</h1>
        <p style={{ margin: '14px 0 0', fontSize: 16, color: 'var(--gt-text-2)', textAlign: 'center', lineHeight: 1.5 }}>{s.body}</p>
        {/* dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '32px 0' }}>
          {slides.map((_, i) => (
            <span key={i} style={{ width: i === slide ? 24 : 8, height: 8, borderRadius: 4, background: i === slide ? 'var(--acc)' : 'var(--gt-line-2)', transition: 'all .3s' }} />
          ))}
        </div>
        <button style={{ width: '100%', padding: '17px', borderRadius: 'var(--gt-r-md)', border: 'none', background: 'var(--acc)', color: 'var(--gt-bg)', fontFamily: 'var(--gt-sans)', fontWeight: 700, fontSize: 17 }}>
          {slide === 2 ? 'Commencer' : 'Suivant'}
        </button>
      </GTMobileScreen>
    </IOSDevice>
  );
}

/* =======================  AUTH  ======================= */
function IOSAuth() {
  const field = (label, value, ph, dot) => (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '15px 16px', borderRadius: 'var(--gt-r-md)', background: 'var(--gt-surface-2)', border: `1.5px solid ${value ? 'var(--gt-brand)' : 'var(--gt-line)'}` }}>
        <span style={{ flex: 1, fontSize: 16, color: value ? 'var(--gt-text)' : 'var(--gt-text-4)' }}>{dot ? '••••••••' : (value || ph)}</span>
        {value && !dot && <span style={{ color: 'var(--gt-brand)', fontWeight: 600 }}>|</span>}
      </div>
    </div>
  );
  return (
    <IOSDevice dark>
      <GTMobileScreen pad={28}>
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 32, marginTop: 20 }}>
          <GTLogo size={28} />
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Crée ton compte</h1>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--gt-text-2)' }}>Garde ta série, tes stats et tes amis.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {field('Pseudo', 'leamartin', 'Ton pseudo')}
          {field('E-mail', 'lea@email.com', 'ton@email.com')}
          {field('Mot de passe', 'secret', '', true)}
        </div>
        <button style={{ width: '100%', marginTop: 26, padding: '17px', borderRadius: 'var(--gt-r-md)', border: 'none', background: 'var(--gt-brand)', color: 'var(--gt-bg)', fontFamily: 'var(--gt-sans)', fontWeight: 700, fontSize: 17 }}>Créer mon compte</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--gt-line)' }} />
          <span style={{ fontSize: 13, color: 'var(--gt-text-4)' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'var(--gt-line)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button style={{ width: '100%', padding: '15px', borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', background: 'var(--gt-surface)', color: 'var(--gt-text)', fontFamily: 'var(--gt-sans)', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}> Continuer avec Apple</button>
          <button style={{ width: '100%', padding: '15px', borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', background: 'var(--gt-surface)', color: 'var(--gt-text)', fontFamily: 'var(--gt-sans)', fontWeight: 600, fontSize: 16 }}>Continuer avec Google</button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 26, fontSize: 14, color: 'var(--gt-text-3)' }}>Déjà un compte ? <span style={{ color: 'var(--gt-brand)', fontWeight: 600 }}>Se connecter</span></p>
      </GTMobileScreen>
    </IOSDevice>
  );
}

/* =======================  HOME / HUB  ======================= */
function IOSHub() {
  return (
    <IOSDevice dark>
      <GTMobileScreen>
        <GTMobileBar greeting="Salut Léa 👋" />
        {/* daily progress chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gt-correct-dim)', color: 'var(--gt-correct)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }} className="gt-mono">1/3</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>1 défi terminé aujourd'hui</div>
            <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)' }}>Termine-les tous pour ta série</div>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Les défis du jour</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GTMobileGameCard game="film" status="done" won attempts={3} />
          <GTMobileGameCard game="serie" status="progress" attempts={2} />
          <GTMobileGameCard game="face" status="todo" />
        </div>
        {/* mini leaderboard */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '26px 0 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Classement amis</div>
          <span style={{ fontSize: 13, color: 'var(--gt-brand)', fontWeight: 600 }}>Tout voir</span>
        </div>
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 8 }}>
          {[{ r: 1, n: 'Karim B.', p: 142, h: 40 }, { r: 2, n: 'Sofia R.', p: 138, h: 200 }, { r: 3, n: 'Léa Martin', p: 131, h: 300, me: true }].map((p) => (
            <div key={p.r} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 8px', borderRadius: 'var(--gt-r-sm)', background: p.me ? 'var(--gt-surface-2)' : 'transparent' }}>
              <span className="gt-mono" style={{ width: 16, fontSize: 14, fontWeight: 700, color: 'var(--gt-warn)' }}>{p.r}</span>
              <GTAvatar name={p.n} size={30} hue={p.h} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: p.me ? 700 : 500 }}>{p.n}{p.me && ' (toi)'}</span>
              <span className="gt-mono" style={{ fontSize: 13, fontWeight: 600 }}>{p.p}</span>
            </div>
          ))}
        </div>
      </GTMobileScreen>
    </IOSDevice>
  );
}

Object.assign(window, { GTMobileScreen, GTMobileBar, GTMobileGameCard, IOSOnboarding, IOSAuth, IOSHub });
