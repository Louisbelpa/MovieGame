/* GuessToday — Landing (logged out) + Hub (logged in) + Hub extended */

function LandingView() {
  return (
    <div className="gt-root" style={{ width: 1440, minHeight: 1500 }}>
      <GTWebNav authed={false} />
      {/* hero */}
      <section style={{ padding: '80px 64px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in oklab, var(--gt-brand) 18%, transparent), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 720, position: 'relative' }}>
          <GTBadge tone="accent" style={{ marginBottom: 20 }}>Nouveau défi chaque jour à minuit</GTBadge>
          <h1 style={{ margin: 0, fontSize: 64, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.02 }}>
            Trois devinettes.<br/>Une par jour.<br/><span style={{ color: 'var(--gt-brand)' }}>Tout le monde joue le même défi.</span>
          </h1>
          <p style={{ margin: '24px 0 0', fontSize: 19, color: 'var(--gt-text-2)', maxWidth: 560, lineHeight: 1.5 }}>
            Films, séries, personnalités. 5 essais, 3 indices qui se dévoilent. Compare ton score avec tes amis et garde ta série en vie.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
            <GTButton variant="primary" size="lg">Créer un compte gratuit</GTButton>
            <GTButton variant="ghost" size="lg">Voir le défi du jour</GTButton>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
            <GTStat value="142" label="jours de défis" />
            <GTStat value="28k" label="joueurs quotidiens" />
            <GTStat value="3" label="jeux · bientôt plus" accent="var(--gt-brand)" />
          </div>
        </div>
      </section>

      {/* the 3 games today */}
      <section style={{ padding: '24px 64px 56px' }}>
        <GTSectionHead title="Les défis du jour" action="Mardi 28 mai · #142" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <GTGameCard game="film" status="todo" footnote="72% des joueurs ont trouvé hier" />
          <GTGameCard game="serie" status="todo" footnote="64% des joueurs ont trouvé hier" />
          <GTGameCard game="face" status="todo" footnote="51% des joueurs ont trouvé hier" />
        </div>
      </section>

      {/* how it works */}
      <section style={{ padding: '24px 64px 80px' }}>
        <GTSectionHead title="Comment ça marche" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { n: '01', t: 'Devine en 5 essais', d: 'Tape un titre, l\'autocomplétion t\'aide. Chaque essai compte.' },
            { n: '02', t: 'Des indices se dévoilent', d: 'Bloqué ? Un indice apparaît à chaque essai raté ou passé — 3 au maximum.' },
            { n: '03', t: 'Partage & compare', d: 'Carte de score sans spoiler, classement hebdo entre amis, série de jours.' },
          ].map((s) => (
            <div key={s.n} style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 28 }}>
              <div className="gt-mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gt-brand)' }}>{s.n}</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 14 }}>{s.t}</div>
              <div style={{ fontSize: 14.5, color: 'var(--gt-text-2)', marginTop: 8, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--gt-line)', padding: '28px 64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <GTLogo size={18} />
        <span style={{ fontSize: 13, color: 'var(--gt-text-4)' }}>© 2026 GuessToday · Un nouveau défi chaque jour</span>
      </footer>
    </div>
  );
}

/* Hub — shared renderer so 3-game and 4-game previews use the SAME layout (grid auto-fit) */
function HubView({ games, label = 'Mardi 28 mai · #142' }) {
  const list = games || [
    { game: 'film', status: 'done', won: true, attempts: 3 },
    { game: 'serie', status: 'progress', attempts: 2 },
    { game: 'face', status: 'todo' },
  ];
  return (
    <div className="gt-root" style={{ width: 1440, minHeight: 1080 }}>
      <GTWebNav active="hub" />
      <div style={{ padding: '40px 64px 64px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'start' }}>
        {/* main */}
        <div>
          {/* greeting row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>Salut Léa 👋</h1>
              <p style={{ margin: '8px 0 0', fontSize: 15.5, color: 'var(--gt-text-2)' }}>{label} · Reviens demain pour 3 nouveaux défis.</p>
            </div>
            <GTStreak days={12} size="lg" />
          </div>

          <GTSectionHead title={`Les défis du jour (${list.length})`} action={list.length > 3 ? 'La grille s\'étend automatiquement →' : 'Lance une partie en 1 clic'} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22 }}>
            {list.map((g, i) => <GTGameCard key={i} {...g} />)}
          </div>

          {/* daily progress strip */}
          <div style={{ marginTop: 32, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gt-correct-dim)', color: 'var(--gt-correct)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }} className="gt-mono">
                {list.filter((g) => g.status === 'done').length}/{list.length}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Défis terminés aujourd'hui</div>
                <div style={{ fontSize: 13, color: 'var(--gt-text-3)' }}>Termine-les tous pour garder ta série</div>
              </div>
            </div>
            <GTButton variant="soft" size="sm">Voir mes stats →</GTButton>
          </div>
        </div>

        {/* sidebar: mini leaderboard */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 92 }}>
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Classement amis</h3>
              <GTBadge>Cette semaine</GTBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { r: 1, name: 'Karim B.', pts: 142, hue: 40, me: false },
                { r: 2, name: 'Sofia R.', pts: 138, hue: 200, me: false },
                { r: 3, name: 'Léa Martin', pts: 131, hue: 300, me: true },
                { r: 4, name: 'Tom D.', pts: 119, hue: 150, me: false },
              ].map((p) => (
                <div key={p.r} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px', borderRadius: 'var(--gt-r-sm)', background: p.me ? 'var(--gt-surface-2)' : 'transparent' }}>
                  <span className="gt-mono" style={{ width: 18, fontSize: 14, fontWeight: 700, color: p.r <= 3 ? 'var(--gt-brand)' : 'var(--gt-text-4)' }}>{p.r}</span>
                  <GTAvatar name={p.name} size={30} hue={p.hue} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: p.me ? 700 : 500, color: p.me ? 'var(--gt-text)' : 'var(--gt-text-2)' }}>{p.name}{p.me && ' (toi)'}</span>
                  <span className="gt-mono" style={{ fontSize: 13, fontWeight: 600 }}>{p.pts}</span>
                </div>
              ))}
            </div>
            <GTButton variant="soft" size="sm" full style={{ marginTop: 14 }}>Voir le classement complet</GTButton>
          </div>

          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 22 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Ta série</h3>
            <div style={{ display: 'flex', gap: 5 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 34, borderRadius: 5, background: i < 12 ? 'color-mix(in oklab, var(--gt-warn) 55%, var(--gt-surface))' : 'var(--gt-surface-2)' }} />
              ))}
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--gt-text-3)' }}>12 jours d'affilée. Ne casse pas la chaîne !</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function HubExtendedView() {
  return <HubView label="Aperçu extensibilité · 4 jeux" games={[
    { game: 'film', status: 'done', won: true, attempts: 3 },
    { game: 'serie', status: 'progress', attempts: 2 },
    { game: 'face', status: 'todo' },
    { game: 'game-4', status: 'todo' },
  ]} />;
}

Object.assign(window, { LandingView, HubView, HubExtendedView });
