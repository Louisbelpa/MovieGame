/* GuessToday — CANDY screens: Nav, Landing, Hub, Defeat.
   Arène + Victoire réutilisent window.Arena / window.Victory (directions.jsx, k="b"). */

function GlyphC({ game, size = 26 }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (game === 'film') return (<svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" {...s} /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} /></svg>);
  if (game === 'serie') return (<svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" {...s} /><path d="M8 3l4 4 4-4" {...s} /></svg>);
  if (game === 'face') return (<svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...s} /><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} /></svg>);
  return null;
}

/* ------------------------------- NAV ------------------------------- */
function CandyNav({ active = 'jeux', connected = true }) {
  return (
    <div className="cdy-nav">
      <span className="cdy-logo"><span className="cdy-die">?</span><span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span></span>
      {connected && (
        <nav className="cdy-navlinks">
          {[['jeux', 'Jeux du jour'], ['stats', 'Stats'], ['classement', 'Classement'], ['amis', 'Amis']].map(([k, l]) => (
            <span key={k} className={`cdy-navlink${active === k ? ' on' : ''}`}>{l}</span>
          ))}
        </nav>
      )}
      <span className="cdy-spacer" />
      {connected ? (
        <React.Fragment>
          <span className="cdy-streak">🔥 12</span>
          <span className="cdy-avatar">MR</span>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <span className="cdy-navlink">Se connecter</span>
          <button className="cdy-btn cdy-btn-primary g-film">Créer un compte</button>
        </React.Fragment>
      )}
    </div>
  );
}

/* ----------------------------- LANDING ----------------------------- */
const DECK = [
  { game: 'serie', name: 'SerieGuess', cls: 'g-serie', rot: -9, x: -150, y: 10, z: 1 },
  { game: 'face', name: 'FaceGuess', cls: 'g-face', rot: 8, x: 150, y: 22, z: 2 },
  { game: 'film', name: 'FilmGuess', cls: 'g-film', rot: -1, x: 0, y: -16, z: 3 },
];

function CandyLanding() {
  return (
    <div className="cdy" style={{ width: 1440 }}>
      <CandyNav connected={false} />
      <div className="cdy-hero">
        <div>
          <span className="cdy-eyebrow">🎬 Le rendez-vous quotidien</span>
          <h1 className="cdy-h1">Trois devinettes.<br />Une par jour.<br /><span className="c1">Tout le monde</span> joue le <span className="c2">même défi.</span></h1>
          <p className="cdy-sub">Films, séries, personnalités. 5 essais, des indices qui se dévoilent, et un score à comparer avec tes amis.</p>
          <div className="cdy-cta">
            <button className="cdy-btn cdy-btn-lg cdy-btn-primary g-film">Créer un compte gratuit</button>
            <button className="cdy-btn cdy-btn-lg cdy-btn-soft">Voir le défi du jour</button>
          </div>
          <div className="cdy-stats">
            <div className="cdy-stat"><b style={{ color: 'var(--coral)' }}>142</b><span>jours de défis</span></div>
            <div className="cdy-stat"><b style={{ color: 'var(--grape)' }}>28k</b><span>joueurs / jour</span></div>
            <div className="cdy-stat"><b style={{ color: 'var(--sky)' }}>3</b><span>jeux · bientôt +</span></div>
          </div>
        </div>
        <div className="cdy-deck">
          {DECK.map((d) => (
            <div key={d.game} className={`cdy-deckcard ${d.cls}`}
              style={{ transform: `translate(calc(-50% + ${d.x}px), calc(-50% + ${d.y}px)) rotate(${d.rot}deg)`, zIndex: d.z }}>
              <div className="dk-day cdy-mono">Défi #142</div>
              <div className="dk-ph"><GlyphC game={d.game} size={40} /></div>
              <div className="dk-name">{d.name}</div>
              <div className="dk-foot">5 essais · 3 indices</div>
            </div>
          ))}
        </div>
      </div>
      <div className="cdy-how">
        <div className="cdy-how-grid">
          {[['film', '1', 'Devine', 'Une image, une question. Tape ta réponse — l\'autocomplétion t\'aide à viser juste.'],
            ['serie', '2', 'Débloque des indices', 'Chaque essai raté révèle un indice. À toi de trouver avant la fin.'],
            ['face', '3', 'Compare & partage', 'Garde ta série en vie et défie tes amis sur le score du jour.']].map(([g, n, h, p]) => (
            <div key={n} className={`cdy-step g-${g}`}>
              <div className="n">{n}</div>
              <h4>{h}</h4>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </div>
      <CandyFooter />
    </div>
  );
}

/* ------------------------------- HUB ------------------------------- */
const HUB_GAMES = [
  { game: 'film', cls: 'g-film', name: 'FilmGuess', label: 'Le film du jour', status: 'done', tries: ['w', 'g'] },
  { game: 'serie', cls: 'g-serie', name: 'SerieGuess', label: 'La série du jour', status: 'todo' },
  { game: 'face', cls: 'g-face', name: 'FaceGuess', label: 'La personnalité du jour', status: 'todo' },
];

function CandyHub() {
  return (
    <div className="cdy" style={{ width: 1440 }}>
      <CandyNav active="jeux" />
      <div className="cdy-hub">
        <div className="cdy-hubhead">
          <div>
            <div className="cdy-hello">Salut Marius <span className="wave">👋</span></div>
            <div className="cdy-date cdy-mono">Jeudi 28 mai · Défi #142</div>
          </div>
          <span className="cdy-streak" style={{ fontSize: 17, padding: '11px 18px' }}>🔥 12 jours</span>
        </div>

        <div className="cdy-daybar">
          <div>
            <div className="dd-title">Les défis du jour t'attendent</div>
            <div className="dd-sub">Reviens chaque jour pour 3 nouvelles devinettes.</div>
          </div>
          <div className="cdy-prog">
            <span className="dd-sub" style={{ fontWeight: 700, color: 'var(--ink)' }}>1 / 3 terminé</span>
            <span className="cdy-progdots"><i className="done" /><i /><i /></span>
          </div>
        </div>

        <div className="cdy-games">
          {HUB_GAMES.map((g) => (
            <div key={g.game} className={`cdy-gamecard ${g.cls}`}>
              <div className="cdy-gc-top">
                <div className="cdy-gc-glyph"><GlyphC game={g.game} /></div>
                <div className="cdy-gc-name">{g.name}</div>
                <div className="cdy-gc-label">{g.label}</div>
              </div>
              <div className={`cdy-gc-img${g.status === 'todo' ? ' locked' : ''}`}>{g.status === 'done' ? 'AFFICHE DU JOUR' : ''}</div>
              <div className="cdy-gc-body">
                {g.status === 'done' ? (
                  <React.Fragment>
                    <div className="cdy-gc-status done"><span className="tk">✓</span> Trouvé en 3/5
                      <span className="cdy-dots" style={{ marginLeft: 'auto' }}><i className="w" /><i className="g" /><i /><i /><i /></span>
                    </div>
                    <button className="cdy-btn cdy-btn-soft" style={{ width: '100%' }}>Voir le résultat</button>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <div className="cdy-gc-status todo"><span className="tk">·</span> Pas encore joué</div>
                    <button className="cdy-btn cdy-btn-primary" style={{ width: '100%' }}>Jouer maintenant →</button>
                  </React.Fragment>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="cdy-summary">
          <div>
            <div className="sm-label cdy-mono">TON SCORE DU JOUR</div>
            <div className="sm-score">1<span style={{ fontSize: 26, color: 'var(--ink-3)' }}> / 3 jeux</span></div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
            <span className="cdy-mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>Termine les 3 pour partager ta journée</span>
            <button className="cdy-btn cdy-btn-mint">Partager ma journée</button>
          </div>
        </div>
      </div>
      <CandyFooter />
    </div>
  );
}

/* ------------------------------ DEFEAT ----------------------------- */
function CandyDefeat() {
  return (
    <div className="cdy g-film" style={{ width: 760 }}>
      <div className="cdy-end">
        <div className="e-tag">PERDU POUR AUJOURD'HUI</div>
        <div className="e-emoji">🫥</div>
        <div className="e-answer">
          <span className="e-poster">AFFICHE</span>
          <div>
            <div className="e-alabel">La réponse était</div>
            <div className="e-atitle">Interstellar</div>
          </div>
        </div>
        <div className="e-streak">Série remise à zéro · <b>🔥 0</b> jour</div>
        <p style={{ margin: '4px 0 0', color: 'var(--ink-2)', fontWeight: 500, fontSize: 16 }}>Pas de panique — un nouveau défi t'attend demain.</p>
        <button className="cdy-btn cdy-btn-lg cdy-btn-primary" style={{ width: '100%', marginTop: 6 }}>Partager quand même</button>
        <div className="cdy-mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Prochain défi dans 04:12:38</div>
      </div>
    </div>
  );
}

/* --------------------- GUEST : arène mode découverte --------------------- */
function CandyArenaGuest() {
  return (
    <div className="cdy" style={{ width: 760 }}>
      <div className="cdy-guestbar">
        <span className="gb-emoji">👋</span>
        <div>
          <div className="gb-title">Tu joues en invité</div>
          <div className="gb-sub">Crée un compte pour garder ta série et tes stats.</div>
        </div>
        <button className="cdy-btn cdy-btn-primary g-film gb-btn">Créer un compte</button>
      </div>
      <Arena k="b" />
    </div>
  );
}

/* --------------------- GUEST : fin de partie + mur d'inscription --------------------- */
function CandyGuestWin() {
  return (
    <div className="cdy g-film" style={{ width: 760 }}>
      <div className="cdy-gw">
        <div className="gw-tag">BIEN JOUÉ !</div>
        <div className="gw-score">3<span>/ 5 essais</span></div>
        <div className="gw-answer">
          <span className="gw-poster">AFFICHE</span>
          <div>
            <div className="gw-alabel">La réponse était</div>
            <div className="gw-atitle">Interstellar</div>
          </div>
        </div>

        <div className="gw-wall">
          <div className="w-flame">🔥</div>
          <h3>Ne perds pas ce score</h3>
          <p>Crée un compte gratuit pour sauvegarder ta partie, démarrer ta série et défier tes amis.</p>
          <div className="gw-perks">
            <span className="gw-perk">🔥 Garde ta série</span>
            <span className="gw-perk">📊 Tes stats</span>
            <span className="gw-perk">👥 Tes amis</span>
          </div>
          <div className="w-cta">
            <button className="cdy-btn cdy-btn-lg cdy-btn-primary" style={{ width: '100%' }}>Créer un compte gratuit</button>
            <span className="w-ghost">Continuer sans compte</span>
          </div>
        </div>

        <div className="gw-teaser">
          <div className="gw-teaser-head">✨ +2 défis t'attendent aujourd'hui</div>
          <div className="gw-teaser-cards">
            <div className="gw-mini g-serie">
              <span className="gm-glyph"><GlyphC game="serie" size={22} /></span>
              <div><div className="gm-name">SerieGuess</div><div className="gm-sub">La série du jour</div></div>
              <span className="gm-lock">🔒</span>
            </div>
            <div className="gw-mini g-face">
              <span className="gm-glyph"><GlyphC game="face" size={22} /></span>
              <div><div className="gm-name">FaceGuess</div><div className="gm-sub">La personnalité du jour</div></div>
              <span className="gm-lock">🔒</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ FOOTER ----------------------------- */
function CandyFooter() {
  const cols = [
    ['Les jeux', ['FilmGuess', 'SerieGuess', 'FaceGuess', 'Défi du jour']],
    ['Découvrir', ['Comment jouer', 'Classement', 'Le blog', 'Nouveautés']],
    ['GuessToday', ['À propos', 'Nous contacter', 'CGU', 'Confidentialité']],
  ];
  return (
    <footer className="cdy-footer">
      <div className="cdy-foot-main">
        <div className="cdy-foot-brand">
          <span className="cdy-foot-logo"><span className="d">?</span><span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span></span>
          <p className="cdy-foot-tag">Trois devinettes par jour, le même défi pour tout le monde. Garde ta série en vie et défie tes amis.</p>
          <div className="cdy-foot-social"><span>✦</span><span>◐</span><span>✈</span><span>✎</span></div>
        </div>
        <div className="cdy-foot-cols">
          {cols.map(([h, links]) => (
            <div className="cdy-foot-col" key={h}>
              <h5>{h}</h5>
              {links.map((l) => <a key={l}>{l}</a>)}
            </div>
          ))}
        </div>
      </div>
      <div className="cdy-foot-bottom">
        <span>© 2026 GuessToday · Fait avec 🧡 à Paris</span>
        <span className="langs"><span className="on">FR</span><span>EN</span><span>ES</span></span>
      </div>
    </footer>
  );
}

Object.assign(window, { CandyNav, CandyLanding, CandyHub, CandyDefeat, GlyphC, CandyArenaGuest, CandyGuestWin, CandyFooter });
