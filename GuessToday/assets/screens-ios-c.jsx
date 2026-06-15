/* GuessToday — iOS mobile screens (part C):
   Result + native Share Sheet (combined "Ma journée"), Stats, Profile, Leaderboard, Friends. */

/* =======================  RESULT + NATIVE SHARE SHEET  ======================= */
// The iOS result screen with the system Share Sheet sliding up, featuring the
// COMBINED daily card so the user shares all 3 games in one tap.
function IOSResult() {
  return (
    <IOSDevice dark>
      <div className="gt-root gt-film" style={{ background: 'var(--gt-bg)', minHeight: '100%', padding: '56px 18px 30px', color: 'var(--gt-text)', position: 'relative' }}>
        {/* result header */}
        <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 22 }}>
          <div style={{ fontSize: 44 }}>🎉</div>
          <h1 style={{ margin: '8px 0 4px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Bien joué !</h1>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--gt-text-2)' }}>FilmGuess résolu en 3/5 · 2 indices</p>
        </div>
        {/* answer reveal */}
        <div style={{ display: 'flex', gap: 14, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 16, marginBottom: 18 }}>
          <div className="gt-ph" style={{ width: 64, height: 90, borderRadius: 'var(--gt-r-sm)', flex: '0 0 auto', fontSize: 8 }}>affiche</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Interstellar</div>
            <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)', marginTop: 2 }}>2014 · Science-fiction</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div><div className="gt-mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--acc)' }}>3/5</div><div style={{ fontSize: 10.5, color: 'var(--gt-text-3)' }}>score</div></div>
              <div><div className="gt-mono" style={{ fontSize: 17, fontWeight: 700 }}>#3</div><div style={{ fontSize: 10.5, color: 'var(--gt-text-3)' }}>rang amis</div></div>
            </div>
          </div>
        </div>
        {/* daily progress nudge */}
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['film','serie','face'].map((g, i) => (
              <span key={g} className={`gt-${g}`} style={{ width: 9, height: 9, borderRadius: '50%', background: i < 2 ? 'var(--acc)' : 'var(--gt-line-2)' }} />
            ))}
          </div>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--gt-text-2)' }}>Plus qu'1 défi pour finir ta journée</div>
        </div>
        {/* CTA */}
        <button style={{ width: '100%', padding: '15px', borderRadius: 'var(--gt-r-md)', border: 'none', background: 'var(--acc)', color: 'var(--gt-bg)', fontFamily: 'var(--gt-sans)', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>
          Partager ma journée
        </button>

        {/* dim scrim */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />

        {/* ===== iOS Share Sheet ===== */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50, padding: '0 8px 10px', animation: 'gt-rise .4s ease both' }}>
          <div style={{ background: 'color-mix(in oklab, #1c1c20 92%, transparent)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 14, overflow: 'hidden' }}>
            {/* preview header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.12)' }}>
              {/* mini combined card thumbnail */}
              <div style={{ width: 46, height: 46, borderRadius: 9, overflow: 'hidden', flex: '0 0 auto', border: '0.5px solid rgba(255,255,255,0.15)' }}>
                <div style={{ display: 'flex', height: 4 }}>
                  {['film','serie','face'].map((g) => <div key={g} className={`gt-${g}`} style={{ flex: 1, background: 'var(--acc)' }} />)}
                </div>
                <div style={{ padding: 5, display: 'flex', flexDirection: 'column', gap: 3, background: 'var(--gt-surface)' }}>
                  {['film','serie','face'].map((g) => <div key={g} className={`gt-${g}`} style={{ height: 4, borderRadius: 2, background: 'var(--acc)', opacity: .8 }} />)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Ma journée GuessToday</div>
                <div style={{ fontSize: 12.5, color: 'rgba(235,235,245,0.6)' }}>2/3 résolus · 🔥 12 jours</div>
              </div>
              <span style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)' }}>Image</span>
            </div>
            {/* app row */}
            <div style={{ display: 'flex', gap: 16, padding: '16px 18px', overflow: 'hidden' }}>
              {[
                { n: 'Messages', c: '#34C759', i: '💬' },
                { n: 'WhatsApp', c: '#25D366', i: '📱' },
                { n: 'Copier', c: '#3A3A3C', i: '⧉' },
                { n: 'Instagram', c: '#E1306C', i: '📷' },
                { n: 'Plus', c: '#3A3A3C', i: '•••' },
              ].map((a) => (
                <div key={a.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 60, flex: '0 0 auto' }}>
                  <div style={{ width: 60, height: 60, borderRadius: 15, background: a.c, display: 'grid', placeItems: 'center', fontSize: 24 }}>{a.i}</div>
                  <span style={{ fontSize: 11, color: 'rgba(235,235,245,0.8)', textAlign: 'center', whiteSpace: 'nowrap' }}>{a.n}</span>
                </div>
              ))}
            </div>
            {/* action rows */}
            <div style={{ padding: '0 16px 8px' }}>
              {['Copier l\'image', 'Enregistrer l\'image', 'Partager le lien du défi'].map((t, i) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.1)' : 'none' }}>
                  <span style={{ fontSize: 16, color: '#fff' }}>{t}</span>
                  <span style={{ fontSize: 16 }}>{['⧉','⬇︎','🔗'][i]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* cancel */}
          <div style={{ marginTop: 8, background: '#1c1c20', borderRadius: 14, padding: '15px 0', textAlign: 'center', fontSize: 17, fontWeight: 600, color: 'var(--gt-film)' }}>Annuler</div>
        </div>
      </div>
    </IOSDevice>
  );
}

/* =======================  STATS  ======================= */
function IOSStats() {
  const Bar = ({ label, pct, value, hi, acc }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="gt-mono" style={{ width: 16, fontSize: 12, color: 'var(--gt-text-3)', textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, height: 22, background: 'var(--gt-surface)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: hi ? (acc || 'var(--gt-film)') : 'var(--gt-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 7, minWidth: 26 }}>
          <span className="gt-mono" style={{ fontSize: 11, fontWeight: 600, color: hi ? 'var(--gt-bg)' : 'var(--gt-text-2)' }}>{value}</span>
        </div>
      </div>
    </div>
  );
  return (
    <IOSDevice dark>
      <div className="gt-root gt-film" style={{ background: 'var(--gt-bg)', minHeight: '100%', padding: '56px 18px 30px', color: 'var(--gt-text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 20, color: 'var(--gt-text-3)' }}>‹</span>
          <div><GTBadge tone="accent">FilmGuess · #142</GTBadge></div>
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Stats du jour</h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--gt-text-2)' }}>Toute la communauté sur le défi d'aujourd'hui.</p>
        {/* metric tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
          {[{ v: '72%', l: 'taux de victoire', a: 'var(--gt-correct)' }, { v: '3.4', l: 'essais moy.', a: 'var(--gt-film)' }, { v: '28 412', l: 'joueurs' }, { v: '1.8', l: 'indices moy.' }].map((s, i) => (
            <div key={i} style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: 16 }}>
              <div className="gt-mono" style={{ fontSize: 26, fontWeight: 700, color: s.a || 'var(--gt-text)' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: 'var(--gt-text-3)', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 18, marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Répartition des tentatives</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bar label="1" pct={10} value="6%" />
            <Bar label="2" pct={30} value="18%" />
            <Bar label="3" pct={100} value="28%" hi />
            <Bar label="4" pct={70} value="20%" />
            <Bar label="5" pct={36} value="10%" />
            <Bar label="X" pct={64} value="18%" hi acc="var(--gt-wrong)" />
          </div>
        </div>
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Victoire par indice révélé</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bar label="0" pct={100} value="41%" hi acc="var(--gt-correct)" />
            <Bar label="1" pct={72} value="29%" hi acc="var(--gt-correct)" />
            <Bar label="2" pct={45} value="18%" hi acc="var(--gt-correct)" />
            <Bar label="3" pct={30} value="12%" hi acc="var(--gt-correct)" />
          </div>
        </div>
      </div>
    </IOSDevice>
  );
}

/* =======================  PROFILE  ======================= */
function IOSProfile() {
  const perGame = [
    { game: 'film', played: 98, win: 81, streak: 12 },
    { game: 'serie', played: 76, win: 58, streak: 5 },
    { game: 'face', played: 64, win: 39, streak: 0 },
  ];
  return (
    <IOSDevice dark>
      <div className="gt-root" style={{ background: 'var(--gt-bg)', minHeight: '100%', padding: '56px 18px 30px', color: 'var(--gt-text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <GTAvatar name="Léa Martin" size={84} hue={300} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Léa Martin</div>
            <div style={{ fontSize: 13, color: 'var(--gt-text-3)' }}>@leamartin · depuis janv. 2026</div>
          </div>
          <GTStreak days={12} size="lg" />
        </div>
        {/* top stats */}
        <div style={{ display: 'flex', justifyContent: 'space-around', background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: '16px 8px', marginBottom: 22 }}>
          <div style={{ textAlign: 'center' }}><div className="gt-mono" style={{ fontSize: 22, fontWeight: 700 }}>238</div><div style={{ fontSize: 11.5, color: 'var(--gt-text-3)' }}>parties</div></div>
          <div style={{ textAlign: 'center' }}><div className="gt-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gt-correct)' }}>178</div><div style={{ fontSize: 11.5, color: 'var(--gt-text-3)' }}>victoires</div></div>
          <div style={{ textAlign: 'center' }}><div className="gt-mono" style={{ fontSize: 22, fontWeight: 700 }}>75%</div><div style={{ fontSize: 11.5, color: 'var(--gt-text-3)' }}>réussite</div></div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Stats par jeu</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {perGame.map((p) => {
            const m = GAME_META[p.game];
            const rate = Math.round(p.win / p.played * 100);
            return (
              <div key={p.game} className={m.cls} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: 14 }}>
                <span style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: 10, background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}><GameGlyph game={m.glyph} size={22} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--gt-surface-3)', overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ width: `${rate}%`, height: '100%', background: 'var(--acc)' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="gt-mono" style={{ fontSize: 15, fontWeight: 700 }}>{rate}%</div>
                  <div style={{ fontSize: 11, color: p.streak ? 'var(--gt-warn)' : 'var(--gt-text-4)' }}>{p.streak ? `🔥${p.streak}` : 'série 0'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </IOSDevice>
  );
}

/* =======================  LEADERBOARD  ======================= */
function IOSLeaderboard() {
  const rows = [
    { r: 1, name: 'Karim Benali', pts: 142, hue: 40, d: 'up' },
    { r: 2, name: 'Sofia Rossi', pts: 138, hue: 200, d: 'up' },
    { r: 3, name: 'Léa Martin', pts: 131, hue: 300, me: true, d: 'down' },
    { r: 4, name: 'Tom Dubois', pts: 119, hue: 150, d: 'same' },
    { r: 5, name: 'Marie Chen', pts: 112, hue: 90, d: 'up' },
    { r: 6, name: 'Yanis Petit', pts: 104, hue: 260, d: 'down' },
  ];
  const arrow = { up: { c: 'var(--gt-correct)', s: '▲' }, down: { c: 'var(--gt-wrong)', s: '▼' }, same: { c: 'var(--gt-text-4)', s: '–' } };
  return (
    <IOSDevice dark>
      <div className="gt-root" style={{ background: 'var(--gt-bg)', minHeight: '100%', padding: '56px 18px 30px', color: 'var(--gt-text)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Classement</h1>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--gt-text-2)' }}>Parmi tes amis · victoires & score moyen.</p>
        {/* segmented */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--gt-surface)', borderRadius: 'var(--gt-r-pill)', padding: 4, marginBottom: 18, border: '1px solid var(--gt-line)' }}>
          <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 'var(--gt-r-pill)', fontSize: 13, fontWeight: 700, background: 'var(--gt-surface-3)' }}>Cette semaine</span>
          <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 'var(--gt-r-pill)', fontSize: 13, fontWeight: 500, color: 'var(--gt-text-3)' }}>Ce mois</span>
        </div>
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 6 }}>
          {rows.map((p) => (
            <div key={p.r} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 10px', borderRadius: 'var(--gt-r-sm)', background: p.me ? 'var(--gt-surface-2)' : 'transparent', borderBottom: p.r < rows.length ? '1px solid var(--gt-line)' : 'none' }}>
              <span className="gt-mono" style={{ width: 18, fontSize: 15, fontWeight: 700, color: p.r <= 3 ? 'var(--gt-warn)' : 'var(--gt-text-3)' }}>{p.r}</span>
              <GTAvatar name={p.name} size={36} hue={p.hue} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: p.me ? 700 : 500 }}>{p.name}{p.me && ' (toi)'}</span>
              <span className="gt-mono" style={{ fontSize: 11, fontWeight: 600, color: arrow[p.d].c }}>{arrow[p.d].s}</span>
              <span className="gt-mono" style={{ fontSize: 15, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{p.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </IOSDevice>
  );
}

/* =======================  FRIENDS  ======================= */
function IOSFriends() {
  return (
    <IOSDevice dark>
      <div className="gt-root" style={{ background: 'var(--gt-bg)', minHeight: '100%', padding: '56px 18px 30px', color: 'var(--gt-text)' }}>
        <h1 style={{ margin: '0 0 14px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Amis</h1>
        {/* search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <span style={{ flex: 1, fontSize: 15, color: 'var(--gt-text-4)' }}>Rechercher un pseudo…</span>
        </div>
        {/* import contacts */}
        <button style={{ width: '100%', padding: '13px', borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', background: 'var(--gt-surface)', color: 'var(--gt-text)', fontFamily: 'var(--gt-sans)', fontWeight: 600, fontSize: 14.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
          <span style={{ fontSize: 16 }}>📇</span> Inviter depuis mes contacts
        </button>
        {/* invitations received */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Invitations reçues (2)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {[{ name: 'Lucas Marin', u: 'lucasm', hue: 20 }, { name: 'Nora Haddad', u: 'norah', hue: 180 }].map((f) => (
            <div key={f.u} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '12px 14px' }}>
              <GTAvatar name={f.name} size={40} hue={f.hue} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>@{f.u}</div>
              </div>
              <button style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'var(--gt-brand)', color: 'var(--gt-bg)', fontSize: 18, fontWeight: 700 }}>✓</button>
              <button style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--gt-line-2)', background: 'var(--gt-surface-2)', color: 'var(--gt-text-3)', fontSize: 16 }}>✕</button>
            </div>
          ))}
        </div>
        {/* friends list */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Mes amis (14)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[{ name: 'Karim Benali', u: 'karimb', hue: 40, s: 18 }, { name: 'Sofia Rossi', u: 'sofiar', hue: 200, s: 9 }, { name: 'Marie Chen', u: 'mariec', hue: 90, s: 22 }, { name: 'Tom Dubois', u: 'tomd', hue: 150, s: 4 }].map((f) => (
            <div key={f.u} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '11px 14px' }}>
              <GTAvatar name={f.name} size={38} hue={f.hue} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>@{f.u}</div>
              </div>
              <GTStreak days={f.s} />
            </div>
          ))}
        </div>
      </div>
    </IOSDevice>
  );
}

Object.assign(window, { IOSResult, IOSStats, IOSProfile, IOSLeaderboard, IOSFriends });
