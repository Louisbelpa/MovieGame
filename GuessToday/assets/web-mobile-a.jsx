/* GuessToday — Mobile WEB screens part A: landing, hub, menu, games. */

function MWLanding() {
  return (
    <MWFrame>
      <div className="gt-root" style={{ background: 'var(--gt-bg)' }}>
        <MWHeaderGuest />
        {/* hero */}
        <section style={{ padding: '32px 20px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in oklab, var(--gt-brand) 20%, transparent), transparent 65%)' }} />
          <div style={{ position: 'relative' }}>
            <GTBadge tone="accent" style={{ marginBottom: 16 }}>Nouveau défi chaque jour</GTBadge>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Trois devinettes.<br/>Une par jour.<br/><span style={{ color: 'var(--gt-brand)' }}>Le même défi pour tous.</span></h1>
            <p style={{ margin: '16px 0 0', fontSize: 15.5, color: 'var(--gt-text-2)', lineHeight: 1.5 }}>Films, séries, personnalités. 5 essais, 3 indices. Compare ton score avec tes amis.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <GTButton variant="primary" size="lg" full>Créer un compte gratuit</GTButton>
              <GTButton variant="ghost" size="lg" full>Voir le défi du jour</GTButton>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 28 }}>
              <GTStat value="142" label="jours de défis" />
              <GTStat value="28k" label="joueurs/jour" />
              <GTStat value="3" label="jeux" accent="var(--gt-brand)" />
            </div>
          </div>
        </section>
        {/* games today */}
        <section style={{ padding: '8px 20px 32px' }}>
          <GTSectionHead title="Les défis du jour" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GTGameCard game="film" status="todo" footnote="72% ont trouvé hier" />
            <GTGameCard game="serie" status="todo" footnote="64% ont trouvé hier" />
            <GTGameCard game="face" status="todo" footnote="51% ont trouvé hier" />
          </div>
        </section>
        <footer style={{ borderTop: '1px solid var(--gt-line)', padding: '20px', textAlign: 'center' }}>
          <GTLogo size={16} />
          <div style={{ fontSize: 12, color: 'var(--gt-text-4)', marginTop: 8 }}>© 2026 GuessToday</div>
        </footer>
      </div>
    </MWFrame>
  );
}

function MWHub() {
  const list = [
    { game: 'film', status: 'done', won: true, attempts: 3 },
    { game: 'serie', status: 'progress', attempts: 2 },
    { game: 'face', status: 'todo' },
  ];
  return (
    <MWFrame>
      <div className="gt-root" style={{ background: 'var(--gt-bg)' }}>
        <MWHeader />
        <div style={{ padding: '22px 20px 32px' }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Salut Léa 👋</h1>
          <p style={{ margin: '6px 0 22px', fontSize: 14, color: 'var(--gt-text-2)' }}>Mardi 28 mai · #142</p>

          {/* progress strip */}
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <div className="gt-mono" style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--gt-correct-dim)', color: 'var(--gt-correct)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>1/3</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Défis terminés aujourd'hui</div>
              <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)' }}>Termine-les pour garder ta série</div>
            </div>
          </div>

          <GTSectionHead title={`Défis du jour (${list.length})`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {list.map((g, i) => <GTGameCard key={i} {...g} />)}
          </div>

          {/* mini leaderboard */}
          <div style={{ marginTop: 28, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Classement amis</h3>
              <GTBadge>Cette semaine</GTBadge>
            </div>
            {[
              { r: 1, name: 'Karim B.', pts: 142, hue: 40 },
              { r: 2, name: 'Sofia R.', pts: 138, hue: 200 },
              { r: 3, name: 'Léa Martin', pts: 131, hue: 300, me: true },
            ].map((p) => (
              <div key={p.r} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 6px', borderRadius: 'var(--gt-r-sm)', background: p.me ? 'var(--gt-surface-2)' : 'transparent' }}>
                <span className="gt-mono" style={{ width: 16, fontSize: 13, fontWeight: 700, color: p.r <= 3 ? 'var(--gt-brand)' : 'var(--gt-text-4)' }}>{p.r}</span>
                <GTAvatar name={p.name} size={28} hue={p.hue} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: p.me ? 700 : 500 }}>{p.name}{p.me && ' (toi)'}</span>
                <span className="gt-mono" style={{ fontSize: 13, fontWeight: 600 }}>{p.pts}</span>
              </div>
            ))}
            <GTButton variant="soft" size="sm" full style={{ marginTop: 12 }}>Voir le classement complet</GTButton>
          </div>
        </div>
      </div>
    </MWFrame>
  );
}

function MWMenu() {
  const list = [
    { game: 'film', status: 'done', won: true, attempts: 3 },
    { game: 'serie', status: 'progress', attempts: 2 },
  ];
  return (
    <MWFrame>
      <div className="gt-root" style={{ background: 'var(--gt-bg)', position: 'relative' }}>
        <MWHeader menuOpen />
        <div style={{ padding: '22px 20px 32px' }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Salut Léa 👋</h1>
          <p style={{ margin: '6px 0 22px', fontSize: 14, color: 'var(--gt-text-2)' }}>Mardi 28 mai · #142</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {list.map((g, i) => <GTGameCard key={i} {...g} compact />)}
          </div>
        </div>
        <MWDrawer />
      </div>
    </MWFrame>
  );
}

/* generic mobile-web game screen */
function MWGame({ game, title, blurred, bio, state = 'playing', attempts = [], hints = [], hintsRevealed = 0, inputValue = '', suggestions, answer }) {
  const m = GAME_META[game];
  const total = 5;
  const triesLeft = total - attempts.length;
  return (
    <MWFrame>
      <div className={`gt-root ${m.cls}`} style={{ background: 'var(--gt-bg)' }}>
        <MWHeader />
        <div style={{ padding: '18px 18px 28px' }}>
          {/* game header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
            <span style={{ width: 38, height: 38, borderRadius: 'var(--gt-r-sm)', background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}><GameGlyph game={m.glyph} size={22} /></span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17 }}>{m.name}</div><div className="gt-mono" style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>#142 · 28.05</div></div>
            <GTBadge tone="accent">{m.label}</GTBadge>
            {/* bouton ? — ouvre MWTutorial ; s'ouvre aussi automatiquement à la première partie */}
            <button style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--gt-line-2)', background: 'var(--gt-surface)', color: 'var(--gt-text-3)', fontSize: 15, fontWeight: 700, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>?</button>
          </div>
          {/* image */}
          <div style={{ position: 'relative', borderRadius: 'var(--gt-r-md)', overflow: 'hidden', border: '1px solid var(--gt-line-2)', aspectRatio: blurred ? '1 / 1' : '16 / 10', marginBottom: 14 }}>
            <div className="gt-ph" style={{ position: 'absolute', inset: 0, fontSize: 11, filter: blurred ? 'blur(26px)' : 'none', transform: blurred ? 'scale(1.15)' : 'none' }}>{blurred ? '' : `[ ${m.label.toUpperCase()} ]\nimage nette`}</div>
            {blurred && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 30, opacity: .4 }}>👤</div><div className="gt-mono" style={{ fontSize: 11, color: 'var(--gt-text-3)', marginTop: 4 }}>photo floue</div></div></div>}
            {(state === 'won' || state === 'lost') && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '32px 16px 14px', background: 'linear-gradient(transparent, var(--gt-bg) 88%)' }}><div style={{ fontSize: 11, color: 'var(--gt-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Réponse</div><div style={{ fontSize: 20, fontWeight: 700, color: state === 'won' ? 'var(--gt-correct)' : 'var(--gt-text)' }}>{answer}</div></div>}
          </div>
          {bio && <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '12px 14px', marginBottom: 14 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Bio (vague)</div><p style={{ margin: 0, fontSize: 13.5, color: 'var(--gt-text-2)', lineHeight: 1.5, fontStyle: 'italic' }}>« {bio} »</p></div>}

          {/* title + dots */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
            <div style={{ display: 'flex', gap: 4 }}>{Array.from({ length: total }).map((_, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < attempts.length ? 'var(--gt-text-3)' : 'var(--acc)', opacity: i < attempts.length ? .5 : 1 }} />)}</div>
          </div>

          {(state === 'playing') && <div style={{ marginBottom: 14 }}><GTGuessInput value={inputValue} suggestions={suggestions} placeholder={blurred ? 'Nom…' : 'Titre…'} /></div>}

          <GTAttemptGrid rows={attempts} total={total} />

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Indices ({hintsRevealed}/{hints.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hints.map((h, i) => <GTHintCard key={i} index={i + 1} label={h.label} value={h.value} revealed={i < hintsRevealed} />)}
            </div>
          </div>

          {state === 'playing' && <GTButton variant="ghost" full style={{ marginTop: 16 }}>Passer l'essai →</GTButton>}
        </div>
      </div>
    </MWFrame>
  );
}

const MW_FILM_HINTS = [{ label: 'Année de sortie', value: '2014' }, { label: 'Acteur principal', value: 'M. McConaughey' }, { label: 'Réalisateur', value: 'C. Nolan' }];
function MWFilmStart() { return <MWGame game="film" title="Le film du jour" state="playing" hints={MW_FILM_HINTS} hintsRevealed={0} attempts={[]} inputValue="Inter" suggestions={[{ title: 'Interstellar', meta: '2014 · Sci-Fi' }, { title: 'Inception', meta: '2010 · Thriller' }]} />; }
function MWFilmPlaying() { return <MWGame game="film" title="Le film du jour" state="playing" hints={MW_FILM_HINTS} hintsRevealed={2} attempts={[{ state: 'wrong', text: 'Inception' }, { state: 'skip', text: 'Essai passé' }]} />; }
function MWFace() { return <MWGame game="face" title="La personnalité du jour" blurred bio="Actrice et productrice née dans les années 1960, connue pour des rôles dramatiques récompensés." state="playing" hints={[{ label: 'Domaine', value: 'Cinéma' }, { label: 'Nationalité', value: 'Australienne' }, { label: 'Fait marquant', value: 'Oscar meilleure actrice' }]} hintsRevealed={2} attempts={[{ state: 'wrong', text: 'Naomi Watts' }, { state: 'skip', text: 'Essai passé' }]} suggestions={[{ title: 'Cate Blanchett', meta: 'Actrice · 1969' }]} />; }

Object.assign(window, { MWLanding, MWHub, MWMenu, MWGame, MWFilmStart, MWFilmPlaying, MWFace });
