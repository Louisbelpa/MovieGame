/* GuessToday — CANDY social/result/share screens.
   Stats, Profil, Classement, Amis, Résultat+partage, arène FaceGuess, cartes de partage. */

const GlyphC2 = window.GlyphC;
const CandyFooter = window.CandyFooter;
const GAME_C = {
  film:  { cls: 'g-film',  name: 'FilmGuess',  label: 'Films',         glyph: 'film' },
  serie: { cls: 'g-serie', name: 'SerieGuess', label: 'Séries',        glyph: 'serie' },
  face:  { cls: 'g-face',  name: 'FaceGuess',  label: 'Personnalités', glyph: 'face' },
};

function CAvatar({ name, size = 40, hue = 270 }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className="cdy-av" style={{
      width: size, height: size, fontSize: size * 0.4,
      background: `oklch(0.66 0.16 ${hue})`, boxShadow: `0 ${Math.round(size * 0.1)}px 0 oklch(0.5 0.15 ${hue})`,
    }}>{initials}</span>
  );
}

/* ----------------------- STATS DU JOUR ----------------------- */
function CandyStats() {
  const dist = [['1', 30, '6%', 'coral'], ['2', 55, '18%', 'coral'], ['3', 100, '28%', 'mint', true],
    ['4', 70, '20%', 'coral'], ['5', 38, '10%', 'coral'], ['X', 62, '18%', 'wrong']];
  const byHint = [['0', 100, '41%'], ['1', 72, '29%'], ['2', 46, '18%'], ['3', 30, '12%']];
  return (
    <div className="cdy g-film" style={{ width: 1440 }}>
      <CandyNav active="stats" />
      <div className="cdy-page">
        <span className="cdy-badge" style={{ marginBottom: 14 }}>FilmGuess · #142</span>
        <h1 className="cdy-h1b">Les stats du jour 📊</h1>
        <p className="cdy-lead">Comment toute la communauté a joué le défi d'aujourd'hui.</p>

        <div className="cdy-stat-grid" style={{ margin: '30px 0' }}>
          {[['72%', 'taux de victoire', 'var(--mint)'], ['3,4', 'essais en moyenne', 'var(--coral)'],
            ['28 412', 'joueurs aujourd\'hui', 'var(--ink)'], ['1,8', 'indices en moyenne', 'var(--grape)']].map(([v, l, c]) => (
            <div className="cdy-stat-tile" key={l}><div className="v" style={{ color: c }}>{v}</div><div className="l">{l}</div></div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          <div className="cdy-card" style={{ padding: 26 }}>
            <h3 style={{ margin: '0 0 18px', fontWeight: 700, fontSize: 20 }}>Répartition des tentatives</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {dist.map(([k, pct, val, tone, hl]) => (
                <div className="cdy-bar-row" key={k}>
                  <span className="cdy-bar-key" style={hl ? { color: 'var(--mint-d)' } : null}>{k}</span>
                  <div className="cdy-bar-track"><div className="cdy-bar-fill" style={{ width: pct + '%', background: `var(--${tone})` }}>{val}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="cdy-card" style={{ padding: 26 }}>
            <h3 style={{ margin: '0 0 18px', fontWeight: 700, fontSize: 20 }}>Taux de victoire par indice révélé</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {byHint.map(([k, pct, val]) => (
                <div className="cdy-bar-row" key={k}>
                  <span className="cdy-bar-key">{k}</span>
                  <div className="cdy-bar-track"><div className="cdy-bar-fill" style={{ width: pct + '%', background: 'var(--mint)' }}>{val}</div></div>
                </div>
              ))}
            </div>
            <p style={{ margin: '18px 0 0', fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>41% des gagnants ont trouvé sans aucun indice. 💪</p>
          </div>
        </div>
      </div>
      <CandyFooter />
    </div>
  );
}

/* ----------------------- PROFIL ----------------------- */
function CandyProfile() {
  const perGame = [
    { game: 'film', hue: 30, played: 98, win: 81, streak: 12 },
    { game: 'serie', hue: 285, played: 76, win: 58, streak: 5 },
    { game: 'face', hue: 210, played: 64, win: 39, streak: 0 },
  ];
  const hist = [
    { game: 'film', r: '3/5', won: true, d: 'Aujourd\'hui' },
    { game: 'serie', r: '4/5', won: true, d: 'Aujourd\'hui' },
    { game: 'face', r: 'X/5', won: false, d: 'Hier' },
    { game: 'film', r: '2/5', won: true, d: 'Hier' },
    { game: 'serie', r: '5/5', won: true, d: '26 mai' },
  ];
  return (
    <div className="cdy" style={{ width: 1440 }}>
      <CandyNav active="profil" />
      <div className="cdy-page">
        <div className="cdy-card" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 30 }}>
          <CAvatar name="Léa Martin" size={88} hue={300} />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 30 }}>Léa Martin</h1>
            <div className="cdy-mono" style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 5 }}>@leamartin · Membre depuis janvier 2026</div>
          </div>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <div className="cdy-mstat"><b>238</b><span>parties</span></div>
            <div className="cdy-mstat"><b style={{ color: 'var(--mint)' }}>178</b><span>victoires</span></div>
            <div className="cdy-mstat"><b>75%</b><span>réussite</span></div>
            <span className="cdy-streak" style={{ fontSize: 17, padding: '11px 18px' }}>🔥 12 jours</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, marginTop: 12, alignItems: 'start' }}>
          <div>
            <div className="cdy-sec-head"><h3>Stats par jeu</h3><span className="act">mis à jour dynamiquement</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {perGame.map((p) => {
                const m = GAME_C[p.game]; const pct = Math.round(p.win / p.played * 100);
                return (
                  <div key={p.game} className={`cdy-card cdy-grow ${m.cls}`}>
                    <span className="gg"><GlyphC2 game={m.glyph} size={26} /></span>
                    <div style={{ flex: 1 }}><div className="gname">{m.name}</div><div className="gsub">{p.played} parties · {p.win} victoires</div></div>
                    <div className="gwin"><div className="gwin-track"><div className="gwin-fill" style={{ width: pct + '%' }} /></div><div className="gwin-pct">{pct}% de victoire</div></div>
                    <div className={`gstreak${p.streak ? '' : ' off'}`}><b>{p.streak ? '🔥' + p.streak : '–'}</b><span>série</span></div>
                  </div>
                );
              })}
            </div>
          </div>
          <aside>
            <div className="cdy-sec-head"><h3>Historique</h3></div>
            <div className="cdy-card" style={{ padding: 6 }}>
              {hist.map((h, i) => {
                const m = GAME_C[h.game];
                return (
                  <div key={i} className={`cdy-hrow ${m.cls}`}>
                    <span className="hg"><GlyphC2 game={m.glyph} size={17} /></span>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>{m.name}</div><div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{h.d}</div></div>
                    <span className={`cdy-hres ${h.won ? 'win' : 'lose'}`}>{h.r}</span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
      <CandyFooter />
    </div>
  );
}

/* ----------------------- CLASSEMENT ----------------------- */
function CandyLeaderboard() {
  const rows = [
    { r: 1, name: 'Karim Benali', pts: 142, avg: '2,8', hue: 40, d: 'up' },
    { r: 2, name: 'Sofia Rossi', pts: 138, avg: '3,0', hue: 200, d: 'up' },
    { r: 3, name: 'Léa Martin', pts: 131, avg: '3,2', hue: 300, me: true, d: 'down' },
    { r: 4, name: 'Tom Dubois', pts: 119, avg: '3,5', hue: 150, d: 'same' },
    { r: 5, name: 'Marie Chen', pts: 112, avg: '3,6', hue: 90, d: 'up' },
    { r: 6, name: 'Yanis Petit', pts: 104, avg: '3,9', hue: 260, d: 'down' },
    { r: 7, name: 'Emma Leroy', pts: 98, avg: '4,0', hue: 340, d: 'same' },
  ];
  const arrow = { up: ['▲', 'var(--mint-d)'], down: ['▼', 'var(--wrong-d)'], same: ['–', 'var(--ink-3)'] };
  const podium = [[rows[1], 130, 'var(--ink-2)', 52], [rows[0], 172, 'var(--sun-d)', 64], [rows[2], 110, '#cf8a4e', 52]];
  return (
    <div className="cdy" style={{ width: 1440 }}>
      <CandyNav active="classement" />
      <div className="cdy-page cdy-page-narrow">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div><h1 className="cdy-h1b">Classement amis 🏆</h1><p className="cdy-lead">Victoires et score moyen — moins d'essais = mieux.</p></div>
          <div className="cdy-seg"><span className="on">Hebdo</span><span>Mensuel</span></div>
        </div>

        <div className="cdy-podium" style={{ marginBottom: 30 }}>
          {podium.map(([p, h, col, av], idx) => (
            <div className="cdy-pod" key={p.name}>
              <CAvatar name={p.name} size={av} hue={p.hue} />
              <div className="pname">{p.name}{p.me && ' (toi)'}</div>
              <div className="pbar" style={{ height: h, background: `color-mix(in oklab, ${col} 22%, #fff)` }}>
                <div className="prank" style={{ color: col }}>{p.r}</div>
                <div className="ppts">{p.pts} pts</div>
              </div>
            </div>
          ))}
        </div>

        <div className="cdy-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cdy-thead"><span>#</span><span>Joueur</span><span style={{ textAlign: 'right' }}>Victoires</span><span style={{ textAlign: 'right' }}>Moy.</span><span style={{ textAlign: 'right' }}>Évol.</span></div>
          {rows.map((p) => (
            <div key={p.r} className={`cdy-trow${p.me ? ' me' : ''}`}>
              <span className={`rk${p.r <= 3 ? ' top' : ''}`}>{p.r}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><CAvatar name={p.name} size={36} hue={p.hue} /><span style={{ fontWeight: p.me ? 700 : 600, fontSize: 15 }}>{p.name}{p.me && ' (toi)'}</span></span>
              <span className="num" style={{ fontSize: 15 }}>{p.pts}</span>
              <span className="num" style={{ fontSize: 14, color: 'var(--ink-2)' }}>{p.avg}</span>
              <span className="evo" style={{ color: arrow[p.d][1] }}>{arrow[p.d][0]}</span>
            </div>
          ))}
        </div>
      </div>
      <CandyFooter />
    </div>
  );
}

/* ----------------------- AMIS ----------------------- */
function CandyFriends() {
  const friends = [
    { name: 'Karim Benali', u: 'karimb', hue: 40, streak: 18 },
    { name: 'Sofia Rossi', u: 'sofiar', hue: 200, streak: 9 },
    { name: 'Tom Dubois', u: 'tomd', hue: 150, streak: 4 },
    { name: 'Marie Chen', u: 'mariec', hue: 90, streak: 22 },
    { name: 'Yanis Petit', u: 'yanisp', hue: 260, streak: 0 },
    { name: 'Emma Leroy', u: 'emmal', hue: 340, streak: 7 },
  ];
  return (
    <div className="cdy" style={{ width: 1440 }}>
      <CandyNav active="amis" />
      <div className="cdy-page cdy-page-narrow">
        <h1 className="cdy-h1b">Mes amis 👥</h1>
        <p className="cdy-lead" style={{ marginBottom: 22 }}>Cherche par pseudo, gère tes invitations et ta liste d'amis.</p>
        <div className="cdy-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span className="ph">Rechercher un pseudo…</span>
          <button className="cdy-btn cdy-btn-primary g-film" style={{ padding: '10px 18px' }}>Inviter</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginTop: 30, alignItems: 'start' }}>
          <div>
            <div className="cdy-sec-head" style={{ marginTop: 0 }}><h3>Mes amis (14)</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {friends.map((f) => (
                <div key={f.u} className="cdy-card cdy-friend">
                  <CAvatar name={f.name} size={42} hue={f.hue} />
                  <div style={{ flex: 1, minWidth: 0 }}><div className="fname">{f.name}</div><div className="fu">@{f.u}</div></div>
                  {f.streak > 0 && <span className="cdy-streak" style={{ fontSize: 13, padding: '6px 11px' }}>🔥 {f.streak}</span>}
                </div>
              ))}
            </div>
          </div>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <div className="cdy-sec-head" style={{ marginTop: 0 }}><h3>Reçues (2)</h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[{ name: 'Lucas Marin', u: 'lucasm', hue: 20 }, { name: 'Nora Haddad', u: 'norah', hue: 180 }].map((f) => (
                  <div key={f.u} className="cdy-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <CAvatar name={f.name} size={40} hue={f.hue} />
                      <div><div className="fname">{f.name}</div><div className="fu">@{f.u}</div></div>
                    </div>
                    <div style={{ display: 'flex', gap: 9 }}>
                      <button className="cdy-btn cdy-btn-mint" style={{ flex: 1, padding: '11px 0' }}>Accepter</button>
                      <button className="cdy-btn cdy-btn-soft" style={{ flex: 1, padding: '11px 0' }}>Refuser</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="cdy-sec-head" style={{ marginTop: 0 }}><h3>Envoyées (1)</h3></div>
              <div className="cdy-card cdy-friend">
                <CAvatar name="Hugo Blanc" size={40} hue={120} />
                <div style={{ flex: 1 }}><div className="fname">Hugo Blanc</div><div className="fu">@hugob</div></div>
                <span className="cdy-badge" style={{ background: '#fff1d6', color: '#b8841f' }}>En attente</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <CandyFooter />
    </div>
  );
}

/* ----------------------- RÉSULTAT + PARTAGE ----------------------- */
function CandyResult() {
  return (
    <div className="cdy g-film" style={{ width: 1440 }}>
      <CandyNav active="jeux" />
      <div className="cdy-page" style={{ display: 'grid', gridTemplateColumns: '1fr 410px', gap: 40, alignItems: 'start' }}>
        <div>
          <span className="cdy-badge" style={{ background: 'var(--correct-soft)', color: 'var(--correct-d)', marginBottom: 14 }}>✓ Résolu en 3/5</span>
          <h1 className="cdy-h1b">Bien joué, Léa ! 🎉</h1>
          <p className="cdy-lead">FilmGuess · #142 · Tu as trouvé <strong style={{ color: 'var(--ink)' }}>Interstellar</strong> en 3 essais avec 2 indices.</p>

          <div className="cdy-card" style={{ display: 'flex', gap: 22, padding: 24, marginTop: 26 }}>
            <span className="cdy-gc-img" style={{ width: 130, height: 184, borderRadius: 16, flex: '0 0 auto', aspectRatio: 'auto' }}>AFFICHE</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 26 }}>Interstellar</div>
              <div className="cdy-mono" style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 3 }}>2014 · Science-fiction · 2h49</div>
              <p style={{ margin: '14px 0 0', fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 360, fontWeight: 400 }}>Réalisé par Christopher Nolan, avec Matthew McConaughey et Anne Hathaway.</p>
              <div style={{ display: 'flex', gap: 26, marginTop: 20 }}>
                <div className="cdy-mstat"><b style={{ color: 'var(--coral)' }}>3/5</b><span>ton score</span></div>
                <div className="cdy-mstat"><b>2</b><span>indices</span></div>
                <div className="cdy-mstat"><b>#3</b><span>rang amis</span></div>
              </div>
            </div>
          </div>

          <div className="cdy-sec-head"><h3>Récap de ta partie</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="dn dn-b" style={{ display: 'contents' }}>
              <div className="ar-row wrong" style={{ background: 'var(--wrong-soft)', color: 'var(--wrong-d)' }}><i style={{ background: 'var(--wrong)', color: '#fff' }}>✕</i><span>Inception</span></div>
              <div className="ar-row skip" style={{ background: '#f1ece6', color: 'var(--ink-2)' }}><i style={{ background: '#d9ccbe', color: '#fff' }}>→</i><span>Essai passé</span></div>
              <div className="ar-row" style={{ background: 'var(--correct-soft)', color: 'var(--correct-d)', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderRadius: 18, fontWeight: 600 }}><i style={{ width: 28, height: 28, borderRadius: 9, display: 'grid', placeItems: 'center', fontWeight: 800, background: 'var(--correct)', color: '#fff' }}>✓</i><span style={{ fontSize: 17 }}>Interstellar</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
            <button className="cdy-btn cdy-btn-soft">Voir les stats du jour →</button>
            <button className="cdy-btn cdy-btn-soft">Retour à l'accueil</button>
          </div>
        </div>

        <aside>
          <div className="cdy-card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 19 }}>Partage ton score</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500 }}>Aucune réponse révélée — sans spoiler.</p>
            <div className="cdy-seg" style={{ display: 'flex', marginBottom: 18, width: '100%' }}><span style={{ flex: 1, textAlign: 'center' }}>Ce jeu</span><span className="on" style={{ flex: 1, textAlign: 'center' }}>Ma journée</span></div>
            <div style={{ display: 'grid', placeItems: 'center' }}><CandyDailyShareCard width={340} /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              <button className="cdy-btn cdy-btn-primary" style={{ width: '100%' }}>Copier la carte</button>
              <div style={{ display: 'flex', gap: 10 }}><button className="cdy-btn cdy-btn-soft" style={{ flex: 1 }}>Partager</button><button className="cdy-btn cdy-btn-soft" style={{ flex: 1 }}>Message</button></div>
            </div>
          </div>
        </aside>
      </div>
      <CandyFooter />
    </div>
  );
}

/* ----------------------- ARÈNE FACEGUESS (photo floue) ----------------------- */
function CandyFaceArena() {
  const sky = { '--accent': '#3bb6f5', '--accent-ink': '#fff', '--accent-soft': 'rgba(59,182,245,.16)', '--slot-used': '#3bb6f5', '--key-shadow': '0 4px 0 #1f93d6', '--btn-shadow': '0 7px 0 #1f93d6', '--icon-shadow': '0 4px 0 #cfeaff', '--badge-shadow': '0 3px 0 #cfeaff' };
  return (
    <div className="dn dn-b arena" style={sky}>
      <div className="ar-top">
        <div className="ar-game">
          <span className="ar-gicon"><GlyphC2 game="face" size={25} /></span>
          <div><div className="ar-gname">FaceGuess</div><div className="ar-gday">Défi #142 · 28 mai</div></div>
        </div>
        <span className="ar-badge">Personnalités</span>
      </div>
      <div className="ar-slots"><span className="ar-slot used" /><span className="ar-slot used" /><span className="ar-slot" /><span className="ar-slot" /><span className="ar-slot" /></div>

      <div className="ar-media" style={{ aspectRatio: '1 / 1' }}>
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(26px)', transform: 'scale(1.15)', backgroundColor: 'var(--ph-bg)', backgroundImage: 'var(--ph-stripe)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div><div style={{ fontSize: 40, opacity: .5 }}>🫥</div><div className="cdy-mono" style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 6 }}>photo floue · reste floue</div></div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '2.5px solid var(--line)', borderRadius: 18, padding: '16px 18px', boxShadow: '0 5px 0 var(--line-2)' }}>
        <div className="cdy-mono" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Extrait biographique (vague)</div>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--ink)', lineHeight: 1.55, fontStyle: 'italic', fontWeight: 400 }}>« Actrice et productrice née dans les années 1960, connue pour des rôles dramatiques récompensés et un engagement dans la production de films indépendants. »</p>
      </div>

      <div className="ar-title"><h2>La personnalité du jour</h2><span className="ar-left">3 essais restants</span></div>
      <div className="ar-input"><span className="ar-inval">Cate</span><span className="ar-key">Valider ↵</span></div>
      <div className="ar-board">
        <div className="ar-row wrong"><i>✕</i><span>Naomi Watts</span><em>actrice · 1968</em></div>
        <div className="ar-row skip"><i>→</i><span>Essai passé</span><em>indice débloqué</em></div>
        <div className="ar-row empty"><i></i><span>À toi de jouer…</span></div>
      </div>
      <div className="ar-hints">
        <div className="ar-hint on"><span className="hl">Domaine</span><span className="hv">Cinéma</span></div>
        <div className="ar-hint on"><span className="hl">Nationalité</span><span className="hv">Australienne</span></div>
        <div className="ar-hint"><span className="hl">Indice 3</span><span className="hv">🔒 verrouillé</span></div>
      </div>
    </div>
  );
}

/* ----------------------- CARTES DE PARTAGE ----------------------- */
const SQ_COLORS = (won, attempts, total = 5) => {
  const arr = [];
  for (let i = 0; i < total; i++) {
    if (won == null) arr.push('unplayed');
    else if (won) arr.push(i < attempts - 1 ? 'wrong' : i === attempts - 1 ? 'win' : 'unused');
    else arr.push(i < attempts ? 'wrong' : 'unused');
  }
  return arr;
};
function ShareSquares({ game, won, attempts }) {
  const m = GAME_C[game];
  return (
    <div className={`cdy-sqs ${m.cls}`}>
      {SQ_COLORS(won, attempts).map((k, i) => (
        <span key={i} className="cdy-sq" style={{
          background: k === 'win' ? 'var(--acc)' : k === 'wrong' ? '#d9ccbe' : 'transparent',
          border: k === 'unused' ? '2.5px solid var(--line-2)' : k === 'unplayed' ? '2.5px dashed var(--line-2)' : 'none',
          opacity: k === 'unplayed' ? .6 : 1,
        }} />
      ))}
    </div>
  );
}

function CandyDailyShareCard({ width = 360 }) {
  const list = [
    { game: 'film', won: true, attempts: 3 },
    { game: 'serie', won: true, attempts: 4 },
    { game: 'face', won: false, attempts: 5 },
  ];
  const solved = list.filter((r) => r.won).length;
  return (
    <div className="cdy-share" style={{ width }}>
      <div className="cdy-share-ribbon">
        {list.map((r) => <div key={r.game} className={GAME_C[r.game].cls} style={{ flex: 1, background: 'var(--acc)' }} />)}
      </div>
      <div className="cdy-share-body">
        <div className="cdy-share-head">
          <span className="cdy-share-logo"><span className="d">?</span>GuessToday</span>
          <span className="cdy-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>#142 · 28.05</span>
        </div>
        <div><div className="cdy-share-title">Ma journée 🎯</div><div className="cdy-share-sub">{solved}/3 défis résolus · 🔥 12 jours</div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {list.map((r) => {
            const m = GAME_C[r.game];
            return (
              <div key={r.game} className={`cdy-share-grow ${m.cls}`}>
                <span className="sg"><GlyphC2 game={m.glyph} size={17} /></span>
                <ShareSquares game={r.game} won={r.won} attempts={r.attempts} />
                <span className="cdy-share-score" style={{ color: r.won ? 'var(--acc)' : 'var(--wrong-d)' }}>{r.won ? r.attempts + '/5' : 'X/5'}</span>
              </div>
            );
          })}
        </div>
        <div className="cdy-share-foot">
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {list.map((r) => <span key={r.game} className={GAME_C[r.game].cls} style={{ width: 9, height: 9, borderRadius: '50%', background: r.won ? 'var(--acc)' : 'var(--wrong)' }} />)}
            <span style={{ marginLeft: 4 }}>3/3 joués</span>
          </span>
          <span>guesstoday.app</span>
        </div>
      </div>
    </div>
  );
}

function CandyShareSingle({ width = 360 }) {
  return (
    <div className="cdy-share g-film" style={{ width }}>
      <div className="cdy-share-ribbon"><div style={{ flex: 1, background: 'var(--acc)' }} /></div>
      <div className="cdy-share-body">
        <div className="cdy-share-head">
          <span className="cdy-share-logo"><span className="d">?</span>GuessToday</span>
          <span className="cdy-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>#142 · 28.05</span>
        </div>
        <div className="cdy-share-grow"><span className="sg"><GlyphC2 game="film" size={17} /></span><div style={{ fontWeight: 700, fontSize: 19 }}>FilmGuess</div></div>
        <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0' }}><ShareSquares game="film" won attempts={3} /></div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20 }}>Trouvé en <span style={{ color: 'var(--acc)' }}>3/5</span> · 2 indices</div>
        <div className="cdy-share-foot"><span>FilmGuess · #142</span><span>guesstoday.app</span></div>
      </div>
    </div>
  );
}

function CandyShareCompare() {
  return (
    <div className="cdy" style={{ width: 900, padding: 40, display: 'flex', gap: 40, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <span className="cdy-badge" style={{ marginBottom: 14 }}>Partage d'un jeu</span>
        <h2 style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 21 }}>Carte d'un défi</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Après une partie, partage ce jeu précis.</p>
        <CandyShareSingle width={360} />
      </div>
      <div style={{ flex: 1 }}>
        <span className="cdy-badge" style={{ marginBottom: 14, background: 'var(--mint-soft)', color: 'var(--mint-d)' }}>Nouveau · partage combiné</span>
        <h2 style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 21 }}>Carte « Ma journée »</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Tous les défis du jour en une carte — un seul partage.</p>
        <CandyDailyShareCard width={360} />
      </div>
    </div>
  );
}

Object.assign(window, { CandyStats, CandyProfile, CandyLeaderboard, CandyFriends, CandyResult, CandyFaceArena, CandyDailyShareCard, CandyShareSingle, CandyShareCompare, CAvatar });
