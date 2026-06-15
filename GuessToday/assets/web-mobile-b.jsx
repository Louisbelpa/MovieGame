/* GuessToday — Mobile WEB screens part B: result+share, stats, profile, leaderboard, friends. */

function MWResult() {
  return (
    <MWFrame>
      <div className="gt-root gt-film" style={{ background: 'var(--gt-bg)' }}>
        <MWHeader />
        <div style={{ padding: '22px 18px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <h1 style={{ margin: '6px 0 4px', fontSize: 24, fontWeight: 700 }}>Bien joué, Léa !</h1>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gt-text-2)' }}>FilmGuess · résolu en 3/5 · 2 indices</p>
          </div>
          {/* answer */}
          <div style={{ display: 'flex', gap: 14, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 16, marginBottom: 20 }}>
            <div className="gt-ph" style={{ width: 64, height: 92, borderRadius: 'var(--gt-r-sm)', flex: '0 0 auto', fontSize: 8 }}>affiche</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Interstellar</div>
              <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)', marginTop: 2 }}>2014 · Science-fiction</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <div><div className="gt-mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--gt-film)' }}>3/5</div><div style={{ fontSize: 10.5, color: 'var(--gt-text-3)' }}>score</div></div>
                <div><div className="gt-mono" style={{ fontSize: 17, fontWeight: 700 }}>#3</div><div style={{ fontSize: 10.5, color: 'var(--gt-text-3)' }}>rang amis</div></div>
              </div>
            </div>
          </div>

          {/* share block with toggle */}
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Partage ton score</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--gt-text-3)' }}>Sans spoiler de la réponse.</p>
            {/* segmented */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--gt-bg-2)', borderRadius: 'var(--gt-r-pill)', padding: 4, marginBottom: 16, border: '1px solid var(--gt-line)' }}>
              <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 'var(--gt-r-pill)', fontSize: 13, fontWeight: 500, color: 'var(--gt-text-3)' }}>Ce jeu</span>
              <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 'var(--gt-r-pill)', fontSize: 13, fontWeight: 700, background: 'var(--gt-surface-3)' }}>Ma journée</span>
            </div>
            <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}>
              <GTDailyShareCard width={318} />
            </div>
            <GTButton variant="accent" full style={{ marginBottom: 10 }}>Copier la carte</GTButton>
            <div style={{ display: 'flex', gap: 10 }}>
              <GTButton variant="soft" full>Partager</GTButton>
              <GTButton variant="soft" full>Message</GTButton>
            </div>
          </div>
          <GTButton variant="ghost" full style={{ marginTop: 16 }}>Voir les stats du jour →</GTButton>
        </div>
      </div>
    </MWFrame>
  );
}

function MWStats() {
  const Bar = ({ label, pct, value, hi, acc }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="gt-mono" style={{ width: 16, fontSize: 12, color: 'var(--gt-text-3)', textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, height: 22, background: 'var(--gt-bg-2)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: hi ? (acc || 'var(--gt-film)') : 'var(--gt-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 7, minWidth: 26 }}>
          <span className="gt-mono" style={{ fontSize: 11, fontWeight: 600, color: hi ? 'var(--gt-bg)' : 'var(--gt-text-2)' }}>{value}</span>
        </div>
      </div>
    </div>
  );
  return (
    <MWFrame>
      <div className="gt-root gt-film" style={{ background: 'var(--gt-bg)' }}>
        <MWHeader />
        <div style={{ padding: '22px 18px 30px' }}>
          <GTBadge tone="accent" style={{ marginBottom: 12 }}>FilmGuess · #142</GTBadge>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Stats du jour</h1>
          <p style={{ margin: '6px 0 20px', fontSize: 13.5, color: 'var(--gt-text-2)' }}>Toute la communauté aujourd'hui.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
            {[{ v: '72%', l: 'taux de victoire', a: 'var(--gt-correct)' }, { v: '3.4', l: 'essais moy.', a: 'var(--gt-film)' }, { v: '28 412', l: 'joueurs' }, { v: '1.8', l: 'indices moy.' }].map((s, i) => (
              <div key={i} style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: 16 }}>
                <div className="gt-mono" style={{ fontSize: 24, fontWeight: 700, color: s.a || 'var(--gt-text)' }}>{s.v}</div>
                <div style={{ fontSize: 12, color: 'var(--gt-text-3)', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 18, marginBottom: 14 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Répartition des tentatives</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Bar label="1" pct={10} value="6%" /><Bar label="2" pct={30} value="18%" /><Bar label="3" pct={100} value="28%" hi /><Bar label="4" pct={70} value="20%" /><Bar label="5" pct={36} value="10%" /><Bar label="X" pct={64} value="18%" hi acc="var(--gt-wrong)" />
            </div>
          </div>
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Victoire par indice révélé</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Bar label="0" pct={100} value="41%" hi acc="var(--gt-correct)" /><Bar label="1" pct={72} value="29%" hi acc="var(--gt-correct)" /><Bar label="2" pct={45} value="18%" hi acc="var(--gt-correct)" /><Bar label="3" pct={30} value="12%" hi acc="var(--gt-correct)" />
            </div>
          </div>
        </div>
      </div>
    </MWFrame>
  );
}

function MWProfile() {
  const perGame = [{ game: 'film', played: 98, win: 81, streak: 12 }, { game: 'serie', played: 76, win: 58, streak: 5 }, { game: 'face', played: 64, win: 39, streak: 0 }];
  return (
    <MWFrame>
      <div className="gt-root" style={{ background: 'var(--gt-bg)' }}>
        <MWHeader />
        <div style={{ padding: '24px 18px 30px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <GTAvatar name="Léa Martin" size={80} hue={300} />
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 21, fontWeight: 700 }}>Léa Martin</div><div style={{ fontSize: 13, color: 'var(--gt-text-3)' }}>@leamartin · depuis janv. 2026</div></div>
            <GTStreak days={12} size="lg" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: '16px 8px', marginBottom: 22 }}>
            <div style={{ textAlign: 'center' }}><div className="gt-mono" style={{ fontSize: 22, fontWeight: 700 }}>238</div><div style={{ fontSize: 11.5, color: 'var(--gt-text-3)' }}>parties</div></div>
            <div style={{ textAlign: 'center' }}><div className="gt-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gt-correct)' }}>178</div><div style={{ fontSize: 11.5, color: 'var(--gt-text-3)' }}>victoires</div></div>
            <div style={{ textAlign: 'center' }}><div className="gt-mono" style={{ fontSize: 22, fontWeight: 700 }}>75%</div><div style={{ fontSize: 11.5, color: 'var(--gt-text-3)' }}>réussite</div></div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Stats par jeu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {perGame.map((p) => {
              const m = GAME_META[p.game]; const rate = Math.round(p.win / p.played * 100);
              return (
                <div key={p.game} className={m.cls} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: 14 }}>
                  <span style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: 10, background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}><GameGlyph game={m.glyph} size={22} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--gt-surface-3)', overflow: 'hidden', marginTop: 6 }}><div style={{ width: `${rate}%`, height: '100%', background: 'var(--acc)' }} /></div>
                  </div>
                  <div style={{ textAlign: 'right' }}><div className="gt-mono" style={{ fontSize: 15, fontWeight: 700 }}>{rate}%</div><div style={{ fontSize: 11, color: p.streak ? 'var(--gt-warn)' : 'var(--gt-text-4)' }}>{p.streak ? `🔥${p.streak}` : 'série 0'}</div></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MWFrame>
  );
}

function MWLeaderboard() {
  const rows = [
    { r: 1, name: 'Karim Benali', pts: 142, hue: 40, d: 'up' }, { r: 2, name: 'Sofia Rossi', pts: 138, hue: 200, d: 'up' },
    { r: 3, name: 'Léa Martin', pts: 131, hue: 300, me: true, d: 'down' }, { r: 4, name: 'Tom Dubois', pts: 119, hue: 150, d: 'same' },
    { r: 5, name: 'Marie Chen', pts: 112, hue: 90, d: 'up' }, { r: 6, name: 'Yanis Petit', pts: 104, hue: 260, d: 'down' },
  ];
  const arrow = { up: { c: 'var(--gt-correct)', s: '▲' }, down: { c: 'var(--gt-wrong)', s: '▼' }, same: { c: 'var(--gt-text-4)', s: '–' } };
  return (
    <MWFrame>
      <div className="gt-root" style={{ background: 'var(--gt-bg)' }}>
        <MWHeader />
        <div style={{ padding: '22px 18px 30px' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Classement amis</h1>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--gt-text-2)' }}>Victoires & score moyen (moins d'essais = mieux).</p>
          <div style={{ display: 'flex', gap: 4, background: 'var(--gt-surface)', borderRadius: 'var(--gt-r-pill)', padding: 4, marginBottom: 18, border: '1px solid var(--gt-line)' }}>
            <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 'var(--gt-r-pill)', fontSize: 13, fontWeight: 700, background: 'var(--gt-surface-3)' }}>Cette semaine</span>
            <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 'var(--gt-r-pill)', fontSize: 13, fontWeight: 500, color: 'var(--gt-text-3)' }}>Ce mois</span>
          </div>
          {/* podium */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 22 }}>
            {[rows[1], rows[0], rows[2]].map((p, idx) => {
              const h = [70, 96, 56][idx]; const medal = ['var(--gt-text-2)', 'var(--gt-warn)', 'oklch(0.62 0.12 50)'][idx];
              return (
                <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, width: 96 }}>
                  <GTAvatar name={p.name} size={idx === 1 ? 52 : 42} hue={p.hue} ring={medal} />
                  <div style={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>{p.name.split(' ')[0]}{p.me && ' (toi)'}</div>
                  <div style={{ width: '100%', height: h, borderRadius: '10px 10px 0 0', background: `linear-gradient(180deg, color-mix(in oklab, ${medal} 30%, var(--gt-surface)), var(--gt-surface))`, border: '1px solid var(--gt-line)', borderBottom: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <div className="gt-mono" style={{ fontSize: 20, fontWeight: 700, color: medal }}>{p.r}</div>
                    <div className="gt-mono" style={{ fontSize: 12, fontWeight: 600 }}>{p.pts}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 6 }}>
            {rows.map((p) => (
              <div key={p.r} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 10px', borderRadius: 'var(--gt-r-sm)', background: p.me ? 'var(--gt-surface-2)' : 'transparent', borderBottom: p.r < rows.length ? '1px solid var(--gt-line)' : 'none' }}>
                <span className="gt-mono" style={{ width: 16, fontSize: 14, fontWeight: 700, color: p.r <= 3 ? 'var(--gt-warn)' : 'var(--gt-text-3)' }}>{p.r}</span>
                <GTAvatar name={p.name} size={34} hue={p.hue} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: p.me ? 700 : 500 }}>{p.name}{p.me && ' (toi)'}</span>
                <span className="gt-mono" style={{ fontSize: 11, fontWeight: 600, color: arrow[p.d].c }}>{arrow[p.d].s}</span>
                <span className="gt-mono" style={{ fontSize: 14, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{p.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MWFrame>
  );
}

function MWFriends() {
  return (
    <MWFrame>
      <div className="gt-root" style={{ background: 'var(--gt-bg)' }}>
        <MWHeader />
        <div style={{ padding: '22px 18px 30px' }}>
          <h1 style={{ margin: '0 0 14px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Amis</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', marginBottom: 22 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <span style={{ flex: 1, fontSize: 15, color: 'var(--gt-text-4)' }}>Rechercher un pseudo…</span>
            <GTButton variant="primary" size="sm">Inviter</GTButton>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Invitations reçues · 2</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {[{ name: 'Lucas Marin', u: 'lucasm', hue: 20 }, { name: 'Nora Haddad', u: 'norah', hue: 180 }].map((f) => (
              <div key={f.u} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '12px 14px' }}>
                <GTAvatar name={f.name} size={40} hue={f.hue} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>@{f.u}</div></div>
                <button style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--gt-brand)', color: 'var(--gt-bg)', fontSize: 17, fontWeight: 700 }}>✓</button>
                <button style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--gt-line-2)', background: 'var(--gt-surface-2)', color: 'var(--gt-text-3)', fontSize: 15 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Mes amis · 14</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ name: 'Karim Benali', u: 'karimb', hue: 40, s: 18 }, { name: 'Sofia Rossi', u: 'sofiar', hue: 200, s: 9 }, { name: 'Marie Chen', u: 'mariec', hue: 90, s: 22 }, { name: 'Tom Dubois', u: 'tomd', hue: 150, s: 4 }].map((f) => (
              <div key={f.u} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '11px 14px' }}>
                <GTAvatar name={f.name} size={38} hue={f.hue} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>@{f.u}</div></div>
                <GTStreak days={f.s} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </MWFrame>
  );
}

/* ====================================================================
   Tutoriel "Comment jouer" — adapté mobile web
   ==================================================================== */

const MW_TUTO_DATA = {
  film: {
    intro: 'Devine le film du jour à partir de son affiche.',
    placeholder: 'Titre du film…',
    wrong: 'Inception',
    answer: 'Interstellar',
    hints: [
      { label: 'Année', value: '2014' },
      { label: 'Acteur principal', value: 'M. McConaughey' },
    ],
    mediaNote: "Une affiche du film s'affiche — à toi de la reconnaître.",
  },
  serie: {
    intro: "Devine la série du jour à partir d'une image.",
    placeholder: 'Titre de la série…',
    wrong: 'Ozark',
    answer: 'Breaking Bad',
    hints: [
      { label: 'Année', value: '2008' },
      { label: 'Plateforme', value: 'Netflix' },
    ],
    mediaNote: "Une scène de la série s'affiche — à toi de la reconnaître.",
  },
  face: {
    intro: "Devine la personnalité du jour — sa photo reste floue jusqu'au bout.",
    placeholder: 'Nom de la personnalité…',
    wrong: 'Naomi Watts',
    answer: 'Cate Blanchett',
    hints: [
      { label: 'Domaine', value: 'Cinéma' },
      { label: 'Nationalité', value: 'Australienne' },
    ],
    mediaNote: "La photo reste floue : appuie-toi sur l'extrait biographique pour deviner.",
  },
};

function MWTutorial({ game = 'film' }) {
  const m = GAME_META[game];
  const td = MW_TUTO_DATA[game] || MW_TUTO_DATA.film;
  return (
    <div style={{ background: 'var(--gt-bg-2)', borderTop: '1px solid var(--gt-line)', display: 'flex', flexDirection: 'column' }}>
      {/* drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--gt-line-2)' }} />
      </div>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px 14px', borderBottom: '1px solid var(--gt-line)' }}>
        <span style={{ width: 42, height: 42, borderRadius: 'var(--gt-r-sm)', background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <GameGlyph game={m.glyph} size={24} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.15 }}>Comment jouer</div>
          <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)', marginTop: 2 }}>{m.name} · {td.intro}</div>
        </div>
        <button style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--gt-line-2)', background: 'var(--gt-surface)', color: 'var(--gt-text-3)', fontSize: 16, fontWeight: 700, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>✕</button>
      </div>

      {/* body — 3 étapes */}
      <div style={{ padding: '18px 18px 6px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* étape 1 — essais */}
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--acc)', color: 'var(--gt-bg)', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>1</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Tu as 5 essais</span>
          </div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ flex: 1, height: 7, borderRadius: 4, background: i < 2 ? 'var(--gt-text-3)' : 'var(--gt-surface-3)', border: i >= 2 ? '1px solid var(--gt-line-2)' : 'none' }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)', border: '1.5px solid var(--acc, var(--gt-line-2))' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--gt-text-4)' }}>{td.placeholder}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--acc)' }}>Valider</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--gt-text-3)', lineHeight: 1.4 }}>L'autocomplétion t'aide à viser juste à chaque saisie.</p>
        </div>

        {/* étape 2 — proximité */}
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--acc)', color: 'var(--gt-bg)', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>2</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Chaque erreur te rapproche</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <GTAttemptRow state="wrong" text={td.wrong} />
            <GTAttemptRow state="correct" text={td.answer} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--gt-text-3)', lineHeight: 1.4 }}>Un indice de proximité s'affiche après chaque tentative ratée.</p>
        </div>

        {/* étape 3 — indices */}
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--acc)', color: 'var(--gt-bg)', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>3</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Des indices se débloquent</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <GTHintCard index={1} label={td.hints[0].label} value={td.hints[0].value} revealed />
            <GTHintCard index={2} label={td.hints[1].label} value={td.hints[1].value} revealed />
            <GTHintCard index={3} label="Indice 3" revealed={false} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--gt-text-3)', lineHeight: 1.4 }}>{td.mediaNote} Reviens chaque jour pour garder ta série 🔥.</p>
        </div>

      </div>

      {/* pied */}
      <div style={{ padding: '16px 18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <GTButton variant="accent" size="lg" full>C'est parti !</GTButton>
        <button style={{ background: 'none', border: 'none', color: 'var(--gt-text-4)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          Ne plus afficher ce tutoriel
        </button>
      </div>
    </div>
  );
}

function MWTutorialScreen({ game = 'film' }) {
  const m = GAME_META[game];
  const blurred = game === 'face';
  return (
    <MWFrame>
      <div className={`gt-root ${m.cls}`} style={{ background: 'var(--gt-bg)', position: 'relative', height: 820 }}>
        {/* arrière-plan flouté — représentation simplifiée de l'arène */}
        <div style={{ filter: 'blur(3px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
          <MWHeader />
          <div style={{ padding: '18px 18px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
              <span style={{ width: 38, height: 38, borderRadius: 'var(--gt-r-sm)', background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}>
                <GameGlyph game={m.glyph} size={22} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{m.name}</div>
                <div className="gt-mono" style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>#142 · 28.05</div>
              </div>
              <GTBadge tone="accent">{m.label}</GTBadge>
            </div>
            <div className="gt-ph" style={{ height: blurred ? 160 : 110, borderRadius: 'var(--gt-r-md)', marginBottom: 12 }} />
            <div style={{ height: 46, background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)', marginBottom: 10 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <GTAttemptRow state="empty" text="" />
              <GTAttemptRow state="empty" text="" />
            </div>
          </div>
        </div>

        {/* scrim + sheet tutoriel */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 20 }}>
          <div style={{ borderRadius: 'var(--gt-r-xl) var(--gt-r-xl) 0 0', overflow: 'hidden', animation: 'gt-rise .35s ease both' }}>
            <MWTutorial game={game} />
          </div>
        </div>
      </div>
    </MWFrame>
  );
}

Object.assign(window, { MWResult, MWStats, MWProfile, MWLeaderboard, MWFriends, MWTutorial, MWTutorialScreen });
