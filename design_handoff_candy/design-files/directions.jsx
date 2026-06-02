/* GuessToday — 3 directions "jeu" : Arène + Victoire, thème piloté par la classe dn-{k}. */

function FilmIcon({ size = 25 }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" {...s} />
      <path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} />
    </svg>
  );
}

const CONFETTI = {
  a: ['#3df2a6', '#ff5cc8', '#4cd6ff', '#ffd23d', '#9b6cff'],
  b: ['#ff7a4d', '#36d39a', '#4cc4ff', '#ffce4a', '#9b6cff', '#ff6b81'],
  c: ['#1f6feb', '#2f9e44', '#e8453c', '#f2a73b', '#16161a'],
};

function Confetti({ k }) {
  const palette = CONFETTI[k];
  const pieces = React.useMemo(() => {
    const rng = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
    return Array.from({ length: 30 }).map((_, i) => {
      const c = palette[i % palette.length];
      return {
        left: (rng(i + 1) * 100).toFixed(1) + '%',
        top: (-10 + rng(i + 2) * 55).toFixed(1) + '%',
        rot: (rng(i + 3) * 360).toFixed(0),
        dur: (2.1 + rng(i + 4) * 1.8).toFixed(2) + 's',
        delay: (-rng(i + 5) * 2.4).toFixed(2) + 's',
        scale: (0.7 + rng(i + 6) * 0.9).toFixed(2),
        color: c,
        round: i % 4 === 0,
      };
    });
  }, [k]);
  return (
    <div className="vc-confetti">
      {pieces.map((p, i) => (
        <span key={i} className="vc-piece" style={{
          left: p.left, top: p.top, background: p.color,
          borderRadius: p.round ? '50%' : '2px',
          transform: `rotate(${p.rot}deg) scale(${p.scale})`,
          animationDuration: p.dur, animationDelay: p.delay,
        }} />
      ))}
    </div>
  );
}

/* ------------------------------- ARÈNE -------------------------------- */
function Arena({ k }) {
  return (
    <div className={`dn dn-${k} arena`}>
      <div className="ar-top">
        <div className="ar-game">
          <span className="ar-gicon"><FilmIcon /></span>
          <div>
            <div className="ar-gname">FilmGuess</div>
            <div className="ar-gday">Défi #142 · 28 mai</div>
          </div>
        </div>
        <span className="ar-badge">Films</span>
      </div>

      <div className="ar-slots">
        <span className="ar-slot used" />
        <span className="ar-slot used" />
        <span className="ar-slot" />
        <span className="ar-slot" />
        <span className="ar-slot" />
      </div>

      <div className="ar-media"><span className="ar-ph">AFFICHE DU JOUR</span></div>

      <div className="ar-title">
        <h2>Le film du jour</h2>
        <span className="ar-left">3 essais restants</span>
      </div>

      <div className="ar-input">
        <span className="ar-inval">Inter</span>
        <span className="ar-key">Valider ↵</span>
      </div>

      <div className="ar-board">
        <div className="ar-row wrong"><i>✕</i><span>Inception</span><em>2010 · trop tôt ↑</em></div>
        <div className="ar-row skip"><i>→</i><span>Essai passé</span><em>indice débloqué</em></div>
        <div className="ar-row empty"><i></i><span>À toi de jouer…</span></div>
      </div>

      <div className="ar-hints">
        <div className="ar-hint on"><span className="hl">Année</span><span className="hv">2014</span></div>
        <div className="ar-hint on"><span className="hl">Acteur</span><span className="hv">M. McConaughey</span></div>
        <div className="ar-hint"><span className="hl">Indice 3</span><span className="hv">🔒 verrouillé</span></div>
      </div>
    </div>
  );
}

/* ------------------------------ VICTOIRE ------------------------------ */
function Victory({ k }) {
  return (
    <div className={`dn dn-${k} victory`}>
      <Confetti k={k} />
      <div className="vc-inner">
        <div className="vc-tag">GAGNÉ !</div>
        <div className="vc-score"><b>3</b><span>/ 5 essais</span></div>
        <div className="vc-answer">
          <span className="vc-poster">AFFICHE</span>
          <div>
            <div className="vc-alabel">La réponse était</div>
            <div className="vc-atitle">Interstellar</div>
          </div>
        </div>
        <div className="vc-rewards">
          <div className="vc-rw flame"><b>🔥 12</b><span>jours de série · +1</span></div>
          <div className="vc-rw xp"><b>+120</b><span>points gagnés</span></div>
        </div>
        <button className="vc-share">Partager mon score</button>
        <div className="vc-next">Prochain défi dans 04:12:38</div>
      </div>
    </div>
  );
}

Object.assign(window, { Arena, Victory });
