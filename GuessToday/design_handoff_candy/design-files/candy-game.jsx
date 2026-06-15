/* GuessToday — CANDY game template. Un seul composant, tous les jeux, tous les états.
   <CandyGame game="film|serie|face" state="start|playing|won|lost|loading" /> */

const GlyphG = window.GlyphC;

const GAME_CFG = {
  film: {
    cls: 'g-film', name: 'FilmGuess', label: 'Films', glyph: 'film',
    title: 'Le film du jour', placeholder: 'Titre du film…', answer: 'Interstellar',
    media: 'AFFICHE DU JOUR\nscène ou affiche', partial: 'Inter',
    wrongs: ['Inception', 'Tenet', 'Dune', 'Arrival'], firstMeta: '2010 · trop tôt ↑',
    hints: [{ l: 'Année', v: '2014' }, { l: 'Acteur', v: 'M. McConaughey' }, { l: 'Réalisateur', v: 'C. Nolan' }],
  },
  serie: {
    cls: 'g-serie', name: 'SerieGuess', label: 'Séries', glyph: 'serie',
    title: 'La série du jour', placeholder: 'Titre de la série…', answer: 'Breaking Bad',
    media: 'IMAGE DU JOUR\nscène marquante', partial: 'Break',
    wrongs: ['Ozark', 'The Wire', 'Narcos', 'Fargo'], firstMeta: 'thriller · proche',
    hints: [{ l: 'Année', v: '2008' }, { l: 'Plateforme', v: 'Netflix' }, { l: 'Genre', v: 'Thriller' }],
  },
  face: {
    cls: 'g-face', name: 'FaceGuess', label: 'Personnalités', glyph: 'face', blurred: true,
    title: 'La personnalité du jour', placeholder: 'Nom de la personnalité…', answer: 'Cate Blanchett',
    bio: 'Actrice et productrice née dans les années 1960, connue pour des rôles dramatiques récompensés et un engagement dans la production de films indépendants.',
    partial: 'Cate', wrongs: ['Naomi Watts', 'Nicole Kidman', 'Tilda Swinton', 'Robin Wright'], firstMeta: 'actrice · 1968',
    hints: [{ l: 'Domaine', v: 'Cinéma' }, { l: 'Nationalité', v: 'Australienne' }, { l: 'Fait marquant', v: 'Oscar' }],
  },
};

function buildAttempts(cfg, state) {
  const w = cfg.wrongs;
  if (state === 'playing') return { rows: [{ k: 'wrong', t: w[0], m: cfg.firstMeta }, { k: 'skip', t: 'Essai passé', m: 'indice débloqué' }], hints: 2 };
  if (state === 'won') return { rows: [{ k: 'wrong', t: w[0], m: cfg.firstMeta }, { k: 'skip', t: 'Essai passé', m: 'indice débloqué' }, { k: 'correct', t: cfg.answer }], hints: 2 };
  if (state === 'lost') return { rows: [{ k: 'wrong', t: w[0], m: cfg.firstMeta }, { k: 'wrong', t: w[1] }, { k: 'skip', t: 'Essai passé', m: '' }, { k: 'wrong', t: w[2] }, { k: 'wrong', t: w[3] }], hints: 3 };
  return { rows: [], hints: 0 };
}

function CandyGame({ game = 'film', state = 'start', dayNum = 142, dateLabel = '28 mai 2026', isToday = true }) {
  const cfg = GAME_CFG[game];
  const { rows, hints: hintsRevealed } = buildAttempts(cfg, state);
  const used = rows.filter((r) => r.k !== 'empty').length;
  const triesLeft = 5 - used;
  const playing = state === 'start' || state === 'playing';
  const finished = state === 'won' || state === 'lost';

  return (
    <div className={`cdy ${cfg.cls}`}>
      <div className="cdy-arena">
        {/* header */}
        <div className="cdy-ar-top">
          <div className="cdy-ar-game">
            <span className="cdy-ar-icon"><GlyphG game={cfg.glyph} size={26} /></span>
            <div><div className="cdy-ar-name">{cfg.name}</div><div className="cdy-ar-day">{cfg.label}</div></div>
          </div>
          <span className="cdy-ar-badge">{cfg.label}</span>
        </div>

        {/* date navigator — accès aux jours précédents */}
        <div className="cdy-datenav">
          <span className="cdy-datenav-arrow" title="Jour précédent">‹</span>
          <div className="cdy-datenav-center">
            <div className="cdy-datenav-date"><span className="cal">📅</span>{dateLabel}</div>
            <div className="cdy-datenav-sub">Défi #{dayNum} · appuie pour l'archive</div>
          </div>
          {isToday
            ? <span className="cdy-datenav-today">Aujourd'hui</span>
            : <span className="cdy-datenav-replay">Ancien défi</span>}
          <span className={`cdy-datenav-arrow${isToday ? ' disabled' : ''}`} title="Jour suivant">›</span>
        </div>

        {/* tries slots */}
        <div className="cdy-ar-slots">
          {Array.from({ length: 5 }).map((_, i) => {
            const isUsed = i < used;
            const cls = isUsed ? (state === 'lost' ? 'miss' : 'used') : '';
            return <span key={i} className={`cdy-ar-slot ${cls}`} />;
          })}
        </div>

        {/* media */}
        <div className={`cdy-ar-media${cfg.blurred ? ' square' : ''}`}>
          {cfg.blurred ? (
            <React.Fragment>
              <div className="cdy-ar-ph blur" />
              <div className="cdy-ar-blurnote"><div className="em">🫥</div><div className="tx">photo floue · reste floue</div></div>
            </React.Fragment>
          ) : (
            <div className="cdy-ar-ph">{cfg.media}</div>
          )}
          {state === 'loading' && <div className="cdy-ar-spin"><i /></div>}
          {finished && (
            <div className="cdy-ar-reveal">
              <div className="rl">La réponse était</div>
              <div className="rv" style={{ color: state === 'won' ? 'var(--correct-d)' : 'var(--ink)' }}>{cfg.answer}</div>
            </div>
          )}
        </div>

        {/* face biography */}
        {cfg.bio && (
          <div className="cdy-ar-bio"><div className="bl">Extrait biographique (vague)</div><p>« {cfg.bio} »</p></div>
        )}

        {/* title + tries */}
        <div className="cdy-ar-title">
          <h2>{cfg.title}</h2>
          {playing && <span className="cdy-ar-left">{triesLeft} essai{triesLeft > 1 ? 's' : ''} restant{triesLeft > 1 ? 's' : ''}</span>}
        </div>

        {/* win/lose banner */}
        {finished && (
          <div className={`cdy-ar-banner ${state === 'won' ? 'win' : 'lose'}`}>
            <span className="be">{state === 'won' ? '🎉' : '😣'}</span>
            <div>
              <div className="bt">{state === 'won' ? `Bravo ! Trouvé en ${used}/5` : 'Perdu pour aujourd\'hui'}</div>
              <div className="bs">{state === 'won' ? 'Reviens demain pour un nouveau défi.' : 'Un nouveau défi t\'attend demain.'}</div>
            </div>
          </div>
        )}

        {/* input */}
        {playing && state !== 'loading' && (
          <div className="cdy-ar-input">
            <span className={`cdy-ar-inval${state === 'start' ? ' empty' : ''}`}>{state === 'start' ? cfg.placeholder : cfg.partial}</span>
            <span className="cdy-ar-key">Valider ↵</span>
          </div>
        )}

        {/* attempts board */}
        <div className="cdy-ar-board">
          <div className="cdy-ar-sub">Tes tentatives</div>
          {rows.length === 0 ? (
            <div className="cdy-ar-row empty"><i></i><span>{state === 'loading' ? 'Préparation du défi…' : 'À toi de jouer — tape ta première réponse.'}</span></div>
          ) : (
            rows.map((r, i) => (
              <div key={i} className={`cdy-ar-row ${r.k}`}>
                <i>{r.k === 'wrong' ? '✕' : r.k === 'skip' ? '→' : '✓'}</i>
                <span>{r.t}</span>
                {r.m ? <em>{r.m}</em> : null}
              </div>
            ))
          )}
        </div>

        {/* hints */}
        <div>
          <div className="cdy-ar-sub" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span>Indices ({hintsRevealed}/3)</span><span style={{ opacity: .7, textTransform: 'none', letterSpacing: 0 }}>1 indice par essai raté</span>
          </div>
          <div className="cdy-ar-hints">
            {cfg.hints.map((h, i) => (
              <div key={i} className={`cdy-ar-hint${i < hintsRevealed ? ' on' : ''}`}>
                <span className="hl">{i < hintsRevealed ? h.l : 'Indice ' + (i + 1)}</span>
                <span className="hv">{i < hintsRevealed ? h.v : '🔒 verrouillé'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* actions */}
        <div className="cdy-ar-actions">
          {playing && state !== 'loading' && (
            <button className="cdy-btn cdy-btn-soft" style={{ width: '100%' }}>Passer l'essai →</button>
          )}
          {finished && (
            <React.Fragment>
              <button className="cdy-btn cdy-btn-primary" style={{ flex: 1 }}>Partager mon score</button>
              <button className="cdy-btn cdy-btn-soft" style={{ flex: 1 }}>Stats du jour</button>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CandyGame, GAME_CFG });

/* ---------------- game switcher + full game page ---------------- */
const CandyNavG = window.CandyNav;
const CandyFooterG = window.CandyFooter;

function CandySwitch({ current }) {
  const order = ['film', 'serie', 'face'];
  const base = { film: { st: 'done', r: '3/5' }, serie: { st: 'todo' }, face: { st: 'todo' } };
  return (
    <div className="cdy-switch">
      <div className="cdy-switch-head">Les défis du jour · change de jeu quand tu veux</div>
      <div className="cdy-switch-tabs">
        {order.map((g) => {
          const cfg = GAME_CFG[g];
          const isCur = g === current;
          const st = isCur ? 'current' : base[g].st;
          const sub = st === 'current' ? 'En cours' : st === 'done' ? 'Réussi ' + base[g].r : 'À jouer';
          const mark = st === 'done' ? '✓' : st === 'current' ? '●' : '→';
          return (
            <div key={g} className={`cdy-switch-tab g-${g} st-${st}${isCur ? ' active' : ''}`}>
              <span className="sg"><GlyphG game={cfg.glyph} size={20} /></span>
              <div><div className="sn">{cfg.name}</div><div className="ss">{sub}</div></div>
              <span className="stk">{mark}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CandyGamePage({ game = 'film', state = 'playing' }) {
  return (
    <div className={`cdy g-${game}`} style={{ width: 1440 }}>
      <CandyNavG active="jeux" />
      <div className="cdy-gamepage">
        <CandySwitch current={game} />
        <div className="cdy-gamestage"><CandyGame game={game} state={state} /></div>
      </div>
      <CandyFooterG />
    </div>
  );
}

Object.assign(window, { CandySwitch, CandyGamePage });

/* ---------------- archive (calendrier des défis passés) ---------------- */
function CandyArchive({ today = 28, monthDays = 31, firstDow = 4, month = 'Mai 2026' }) {
  // résultats déterministes par jour : 3 jeux (film/serie/face) → win|lose|none
  const dayResult = (d) => {
    const r = (n) => { const x = Math.sin((d + 1) * (n + 3) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    return [0, 1, 2].map((g) => {
      if (d > today) return 'none';
      const v = r(g);
      if (d === today && g > 0) return 'none';       // aujourd'hui : seul FilmGuess joué
      return v < 0.62 ? 'win' : v < 0.82 ? 'lose' : 'none';
    });
  };
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= monthDays; d++) cells.push(d);

  return (
    <div className="cdy-archive">
      <div className="cdy-archive-head">
        <span className="ic">📅</span>
        <div>
          <h3>Archive des défis</h3>
          <p>Rejoue les défis que tu as manqués — chaque jour reste accessible.</p>
        </div>
        <span className="cdy-archive-x">✕</span>
      </div>
      <div className="cdy-archive-body">
        <div className="cdy-archive-month">
          <button title="Mois précédent">‹</button>
          <span className="m">{month}</span>
          <button className="disabled" title="Mois suivant">›</button>
        </div>
        <div className="cdy-cal-dow">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="cdy-cal-grid">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="cdy-cal-day empty" />;
            const res = dayResult(d);
            const isToday = d === today;
            const isFuture = d > today;
            const full = !isFuture && res.every((r) => r !== 'none');
            const cls = ['cdy-cal-day', isToday ? 'today' : '', isFuture ? 'future' : '', full ? 'full' : ''].filter(Boolean).join(' ');
            return (
              <div key={i} className={cls}>
                <span className="dn">{d}</span>
                {!isFuture && <span className="dots">{res.map((r, j) => <i key={j} className={r} />)}</span>}
              </div>
            );
          })}
        </div>
        <div className="cdy-archive-legend">
          <span><i className="win" /> Trouvé</span>
          <span><i className="lose" /> Manqué</span>
          <span><i className="none" /> Non joué</span>
          <span style={{ color: 'var(--ink-3)' }}>· 3 pastilles = les 3 jeux du jour</span>
        </div>
      </div>
    </div>
  );
}

function CandyArchiveScreen({ game = 'film' }) {
  return (
    <div className={`cdy g-${game}`} style={{ position: 'relative', width: 760, minHeight: 900 }}>
      <div style={{ filter: 'blur(2px)', opacity: 0.55, pointerEvents: 'none' }}>
        <CandyGame game={game} state="start" />
      </div>
      <div className="cdy-archive-scrim"><CandyArchive /></div>
    </div>
  );
}

Object.assign(window, { CandyArchive, CandyArchiveScreen });
