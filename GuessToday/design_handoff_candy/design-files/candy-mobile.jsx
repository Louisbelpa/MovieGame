/* GuessToday — CANDY mobile screens. Réutilise GAME_CFG + GlyphC (window). */
const GlyphM = window.GlyphC;
const CFG_M = window.GAME_CFG;

function MTabBar({ active = 'jeux' }) {
  const icon = (name) => {
    const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (name === 'jeux') return <svg width="23" height="23" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3" {...s} /><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M18 14h.01" {...s} /></svg>;
    if (name === 'stats') return <svg width="23" height="23" viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7" {...s} /></svg>;
    if (name === 'classement') return <svg width="23" height="23" viewBox="0 0 24 24"><path d="M7 9a5 5 0 0010 0V3H7v6zM5 3h2v3a3 3 0 01-3-3zM17 3h2a3 3 0 01-3 3V3zM9 21h6M12 14v7" {...s} /></svg>;
    return <svg width="23" height="23" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" {...s} /><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" {...s} /></svg>;
  };
  const tabs = [['jeux', 'Jeux'], ['stats', 'Stats'], ['classement', 'Classement'], ['profil', 'Profil']];
  return (
    <div className="cdym-tabs">
      {tabs.map(([k, l]) => (
        <div key={k} className={`cdym-tab${active === k ? ' on' : ''}`}>
          <span className="ic">{icon(k)}</span><span className="lb">{l}</span>
        </div>
      ))}
    </div>
  );
}

function MHeader({ title }) {
  return (
    <div className="cdym-head">
      <span className="cdym-logo"><span className="d">?</span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
      <span className="sp" />
      <span className="cdym-streak-sm">🔥 12</span>
      <span className="cdym-av-sm">MR</span>
    </div>
  );
}

/* ------------------------------- HUB ------------------------------- */
const MHUB = [
  { g: 'film', state: 'done', res: '3/5', dots: ['w', 'g'] },
  { g: 'serie', state: 'todo' },
  { g: 'face', state: 'todo' },
];
function MobileHub() {
  return (
    <div className="cdym g-film">
      <MHeader />
      <div className="cdym-scroll">
        <div className="cdym-ph"><h1>Salut Marius 👋</h1><div className="sub">Jeudi 28 mai · Défi #142</div></div>
        <div className="cdym-day g-film">
          <div style={{ flex: 1, minWidth: 0 }}><div className="t">Défis du jour</div><div className="s">1 / 3 terminé</div></div>
          <span className="dots"><i className="done" /><i /><i /></span>
        </div>
        <div className="cdym-games">
          {MHUB.map((it) => {
            const c = CFG_M[it.g];
            return (
              <div key={it.g} className={`cdym-gc g-${it.g}`}>
                <div className="cdym-gc-top">
                  <span className="cdym-gc-glyph"><GlyphM game={c.glyph} size={24} /></span>
                  <div><div className="cdym-gc-name">{c.name}</div><div className="cdym-gc-label">{c.title}</div></div>
                  <span className="cdym-gc-state">{it.state === 'done' ? '✓ Fini' : 'À jouer'}</span>
                </div>
                <div className="cdym-gc-body">
                  {it.state === 'done' ? (
                    <React.Fragment>
                      <span className="dots"><i className="w" /><i className="g" /><i /><i /><i /></span>
                      <span className="res done">Trouvé en {it.res}</span>
                      <button className="cdym-btn cdym-btn-soft" style={{ marginLeft: 'auto', padding: '10px 14px' }}>Résultat</button>
                    </React.Fragment>
                  ) : (
                    <button className="cdym-btn cdym-btn-primary cdym-btn-block">Jouer maintenant →</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="cdym-sum">
          <div className="l">TON SCORE DU JOUR</div>
          <div className="v">1<span> / 3 jeux</span></div>
        </div>
      </div>
      <MTabBar active="jeux" />
    </div>
  );
}

/* ------------------------------- GAME ------------------------------- */
function mRows(cfg, state) {
  const w = cfg.wrongs;
  if (state === 'playing') return [{ k: 'wrong', t: w[0], m: cfg.firstMeta }, { k: 'skip', t: 'Essai passé', m: 'indice' }];
  if (state === 'won') return [{ k: 'wrong', t: w[0], m: cfg.firstMeta }, { k: 'skip', t: 'Essai passé' }, { k: 'correct', t: cfg.answer }];
  if (state === 'lost') return [{ k: 'wrong', t: w[0] }, { k: 'wrong', t: w[1] }, { k: 'skip', t: 'passé' }, { k: 'wrong', t: w[2] }, { k: 'wrong', t: w[3] }];
  return [];
}
function MobileGameBody({ game = 'film', state = 'playing', dayNum = 142, dateLabel = '28 mai 2026', isToday = true }) {
  const cfg = CFG_M[game];
  const rows = mRows(cfg, state);
  const used = rows.length;
  const hintsRev = state === 'lost' ? 3 : state === 'start' ? 0 : 2;
  const playing = state === 'start' || state === 'playing';
  const finished = state === 'won' || state === 'lost';
  const order = ['film', 'serie', 'face'];
  const baseState = { film: 'done', serie: 'todo', face: 'todo' };
  return (
    <React.Fragment>
        <div className="cdym-switch">
          {order.map((g) => {
            const c = CFG_M[g]; const isCur = g === game;
            const st = isCur ? 'cur' : baseState[g];
            return (
              <div key={g} className={`cdym-stab g-${g}${isCur ? ' active' : ''} ${st}`}>
                <span className="g"><GlyphM game={c.glyph} size={18} /></span>
                <span className="n">{c.name.replace('Guess', '')}</span>
                <span className="st">{st === 'done' ? '✓ 3/5' : st === 'cur' ? '● en cours' : 'à jouer'}</span>
              </div>
            );
          })}
        </div>
        <div className="cdym-datenav">
          <span className="arrow">‹</span>
          <div className="center">
            <div className="d">📅 {dateLabel}</div>
            <div className="s">Défi #{dayNum} · appuie pour l'archive</div>
          </div>
          {isToday ? <span className="tag">Auj.</span> : <span className="tag old">Ancien</span>}
          <span className={`arrow${isToday ? ' disabled' : ''}`}>›</span>
        </div>
        <div className="cdym-arena">
          <div className="cdym-ar-slots">
            {Array.from({ length: 5 }).map((_, i) => <i key={i} className={i < used ? (state === 'lost' ? 'miss' : 'used') : ''} />)}
          </div>
          <div className={`cdym-ar-media${cfg.blurred ? ' square' : ''}`}>
            {cfg.blurred ? (<React.Fragment><span className="blur" /><div className="blurnote"><div className="em">🫥</div><div className="cdym-mono" style={{ fontSize: 10, color: 'var(--ink-2)', marginTop: 4 }}>photo floue</div></div></React.Fragment>) : 'IMAGE DU JOUR'}
          </div>
          {cfg.bio && <div className="cdym-ar-bio"><div className="bl">Bio (vague)</div><p>« {cfg.bio} »</p></div>}
          <div className="cdym-ar-title">{cfg.title}</div>
          {finished && (
            <div className={`cdym-ar-banner ${state === 'won' ? 'win' : 'lose'}`}>
              <span className="e">{state === 'won' ? '🎉' : '😣'}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="t">{state === 'won' ? `Trouvé en ${used}/5 !` : 'Perdu pour aujourd\'hui'}</div><div className="s">{state === 'won' ? 'La réponse : ' + cfg.answer : 'C\'était : ' + cfg.answer}</div></div>
            </div>
          )}
          {playing && (
            <div className="cdym-ar-input">
              <span className={`v${state === 'start' ? ' empty' : ''}`}>{state === 'start' ? cfg.placeholder : cfg.partial}</span>
              <button className="cdym-btn cdym-btn-primary" style={{ padding: '9px 14px' }}>Valider</button>
            </div>
          )}
          {rows.map((r, i) => (
            <div key={i} className={`cdym-ar-row ${r.k}`}><i>{r.k === 'wrong' ? '✕' : r.k === 'skip' ? '→' : '✓'}</i><span>{r.t}</span>{r.m ? <em>{r.m}</em> : null}</div>
          ))}
          {playing && !rows.length && <div className="cdym-ar-row empty"><i></i><span>À toi de jouer…</span></div>}
          <div className="cdym-ar-hints">
            {cfg.hints.map((h, i) => (
              <div key={i} className={`cdym-ar-hint${i < hintsRev ? ' on' : ''}`}><span className="hl">{i < hintsRev ? h.l : 'Indice ' + (i + 1)}</span><span className="hv">{i < hintsRev ? h.v : '🔒'}</span></div>
            ))}
          </div>
          {playing && <button className="cdym-btn cdym-btn-soft cdym-btn-block">Passer l'essai →</button>}
          {finished && <div style={{ display: 'flex', gap: 10 }}><button className="cdym-btn cdym-btn-primary" style={{ flex: 1 }}>Partager</button><button className="cdym-btn cdym-btn-soft" style={{ flex: 1 }}>Stats</button></div>}
        </div>
    </React.Fragment>
  );
}

function MobileGame({ game = 'film', state = 'playing', dayNum = 142, dateLabel = '28 mai 2026', isToday = true }) {
  return (
    <div className={`cdym g-${game}`}>
      <MHeader />
      <div className="cdym-scroll"><MobileGameBody game={game} state={state} dayNum={dayNum} dateLabel={dateLabel} isToday={isToday} /></div>
      <MTabBar active="jeux" />
    </div>
  );
}

/* ------------------------------ PROFILE ----------------------------- */
function MobileProfile() {
  const games = [
    { g: 'film', played: 98, win: 81, hue: 30 },
    { g: 'serie', played: 76, win: 58, hue: 285 },
    { g: 'face', played: 64, win: 39, hue: 210 },
  ];
  return (
    <div className="cdym g-film">
      <MHeader />
      <div className="cdym-scroll">
        <div className="cdym-prof-head">
          <span className="cdym-prof-av" style={{ background: 'oklch(0.66 0.16 300)', boxShadow: '0 6px 0 oklch(0.5 0.15 300)' }}>LM</span>
          <div><div className="cdym-prof-name">Léa Martin</div><div className="cdym-prof-u">@leamartin · depuis janv. 2026</div></div>
        </div>
        <div className="cdym-prof-stats">
          <div className="t"><b>238</b><span>parties</span></div>
          <div className="t"><b style={{ color: 'var(--mint)' }}>178</b><span>victoires</span></div>
          <div className="t"><b>75%</b><span>réussite</span></div>
          <div className="t"><b style={{ color: 'var(--flame)' }}>🔥12</b><span>série</span></div>
        </div>
        <div className="cdym-sec-t">Stats par jeu</div>
        <div className="cdym-list">
          {games.map((p) => {
            const c = CFG_M[p.g]; const pct = Math.round(p.win / p.played * 100);
            return (
              <div key={p.g} className={`cdym-grow g-${p.g}`}>
                <span className="g"><GlyphM game={c.glyph} size={22} /></span>
                <div><div className="n">{c.name}</div><div className="s">{p.played} parties · {p.win} gagnées</div></div>
                <div className="pct"><b style={{ color: 'var(--acc-d)' }}>{pct}%</b><span>victoire</span></div>
              </div>
            );
          })}
        </div>
      </div>
      <MTabBar active="profil" />
    </div>
  );
}

/* ---------------------------- LEADERBOARD --------------------------- */
function MobileLeaderboard() {
  const rows = [
    { r: 1, n: 'Karim B.', p: 142, hue: 40 }, { r: 2, n: 'Sofia R.', p: 138, hue: 200 },
    { r: 3, n: 'Léa M.', p: 131, hue: 300, me: true }, { r: 4, n: 'Tom D.', p: 119, hue: 150 },
    { r: 5, n: 'Marie C.', p: 112, hue: 90 }, { r: 6, n: 'Yanis P.', p: 104, hue: 260 },
  ];
  const pod = [[rows[1], 90, '#8a8a8a', 44], [rows[0], 120, '#d99a1f', 54], [rows[2], 74, '#cf8a4e', 44]];
  return (
    <div className="cdym g-film">
      <MHeader />
      <div className="cdym-scroll">
        <div className="cdym-ph"><h1>Classement 🏆</h1><div className="sub">Cette semaine · entre amis</div></div>
        <div className="cdym-podium">
          {pod.map(([p, h, col, av]) => (
            <div className="cdym-pod" key={p.n}>
              <span className="pav" style={{ width: av, height: av, fontSize: av * 0.38, background: `oklch(0.66 0.16 ${p.hue})`, boxShadow: `0 4px 0 oklch(0.5 0.15 ${p.hue})` }}>{p.n.split(' ').map((x) => x[0]).join('')}</span>
              <div className="pn">{p.n}{p.me && ' (toi)'}</div>
              <div className="pb" style={{ height: h, background: `color-mix(in oklab, ${col} 20%, #fff)` }}>
                <div className="pr" style={{ color: col }}>{p.r}</div><div className="pp">{p.p}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ margin: '0 16px', background: '#fff', borderRadius: 18, border: '2.5px solid var(--line)', boxShadow: '0 5px 0 var(--line-2)', overflow: 'hidden' }}>
          {rows.map((p) => (
            <div key={p.r} className={`cdym-lrow${p.me ? ' me' : ''}`}>
              <span className="rk">{p.r}</span>
              <span className="av" style={{ width: 32, height: 32, background: `oklch(0.66 0.16 ${p.hue})` }}>{p.n.split(' ').map((x) => x[0]).join('')}</span>
              <span className="nm">{p.n}{p.me && ' (toi)'}</span>
              <span className="pt">{p.p} pts</span>
            </div>
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>
      <MTabBar active="classement" />
    </div>
  );
}

Object.assign(window, { MobileHub, MobileGame, MobileGameBody, MobileProfile, MobileLeaderboard, MTabBar, MHeader });
