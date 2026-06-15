/* GuessToday — Result+Share, Daily Stats, Profile, Leaderboard, Friends */

/* ---------- Result + share ---------- */
function ResultView() {
  return (
    <div className="gt-root gt-film" style={{ width: 1440, minHeight: 1080 }}>
      <GTWebNav active="hub" />
      <div style={{ padding: '40px 64px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 48, alignItems: 'start' }}>
        <div>
          <GTBadge tone="success" style={{ marginBottom: 16 }}>✓ Résolu en 3/5</GTBadge>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em' }}>Bien joué, Léa !</h1>
          <p style={{ margin: '10px 0 0', fontSize: 16, color: 'var(--gt-text-2)' }}>FilmGuess · #142 · Tu as trouvé <strong style={{ color: 'var(--gt-text)' }}>Interstellar</strong> en 3 essais avec 2 indices.</p>

          {/* answer reveal */}
          <div style={{ marginTop: 28, display: 'flex', gap: 20, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 24 }}>
            <div className="gt-ph" style={{ width: 120, height: 168, borderRadius: 'var(--gt-r-md)', flex: '0 0 auto', fontSize: 10 }}>affiche</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Interstellar</div>
              <div style={{ fontSize: 14, color: 'var(--gt-text-3)', marginTop: 2 }}>2014 · Science-fiction · 2h49</div>
              <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--gt-text-2)', lineHeight: 1.5, maxWidth: 380 }}>
                Réalisé par Christopher Nolan, avec Matthew McConaughey et Anne Hathaway.
              </p>
              <div style={{ display: 'flex', gap: 14, marginTop: 18 }}>
                <GTStat value="3/5" label="ton score" accent="var(--gt-film)" />
                <GTStat value="2" label="indices" />
                <GTStat value="#3" label="rang amis" />
              </div>
            </div>
          </div>

          {/* attempt recap */}
          <div style={{ marginTop: 24 }}>
            <GTSectionHead title="Récap de ta partie" />
            <GTAttemptGrid rows={[
              { state: 'wrong', text: 'Inception' },
              { state: 'skip', text: 'Essai passé' },
              { state: 'correct', text: 'Interstellar' },
            ]} total={5} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <GTButton variant="soft" size="lg">Voir les stats du jour →</GTButton>
            <GTButton variant="ghost" size="lg">Retour à l'accueil</GTButton>
          </div>
        </div>

        {/* share panel */}
        <aside style={{ position: 'sticky', top: 92 }}>
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 24 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Partage ton score</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--gt-text-3)' }}>Aucune réponse révélée — sans spoiler.</p>
            {/* segmented: this game vs. whole day */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--gt-bg-2)', borderRadius: 'var(--gt-r-pill)', padding: 4, marginBottom: 18, border: '1px solid var(--gt-line)' }}>
              <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 'var(--gt-r-pill)', fontSize: 13, fontWeight: 500, color: 'var(--gt-text-3)' }}>Ce jeu</span>
              <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 'var(--gt-r-pill)', fontSize: 13, fontWeight: 700, background: 'var(--gt-surface-3)', color: 'var(--gt-text)' }}>Ma journée</span>
            </div>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <GTDailyShareCard width={336} results={[
                { game: 'film', won: true, attempts: 3 },
                { game: 'serie', won: true, attempts: 4 },
                { game: 'face', won: false, attempts: 5 },
              ]} />
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 12.5, color: 'var(--gt-text-4)', textAlign: 'center' }}>Partage tes 3 défis du jour en une seule carte.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              <GTButton variant="accent" full>Copier la carte</GTButton>
              <div style={{ display: 'flex', gap: 10 }}>
                <GTButton variant="soft" full>Partager</GTButton>
                <GTButton variant="soft" full>Message</GTButton>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Daily global stats ---------- */
function StatsView() {
  return (
    <div className="gt-root gt-film" style={{ width: 1440, minHeight: 1080 }}>
      <GTWebNav active="stats" />
      <div style={{ padding: '40px 64px 64px' }}>
        <GTBadge tone="accent" style={{ marginBottom: 14 }}>FilmGuess · #142</GTBadge>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>Statistiques du jour</h1>
        <p style={{ margin: '8px 0 0', fontSize: 15.5, color: 'var(--gt-text-2)' }}>Comment toute la communauté a joué le défi d'aujourd'hui.</p>

        {/* top metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, margin: '32px 0' }}>
          {[
            { v: '72%', l: 'taux de victoire', a: 'var(--gt-correct)' },
            { v: '3.4', l: 'essais en moyenne', a: 'var(--gt-film)' },
            { v: '28 412', l: 'joueurs aujourd\'hui' },
            { v: '1.8', l: 'indices en moyenne' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 24 }}>
              <div className="gt-mono" style={{ fontSize: 36, fontWeight: 700, color: s.a || 'var(--gt-text)' }}>{s.v}</div>
              <div style={{ fontSize: 13.5, color: 'var(--gt-text-3)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* attempt distribution */}
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 26 }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700 }}>Répartition des tentatives</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GTBar label="1" pct={6} value="6%" />
              <GTBar label="2" pct={18} value="18%" />
              <GTBar label="3" pct={62} value="28%" accent="var(--gt-film)" highlight />
              <GTBar label="4" pct={44} value="20%" />
              <GTBar label="5" pct={22} value="10%" />
              <GTBar label="X" pct={40} value="18%" accent="var(--gt-wrong)" highlight />
            </div>
          </div>

          {/* win rate by hint */}
          <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 26 }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700 }}>Taux de victoire par indice révélé</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <GTBar label="0" pct={88} value="41%" accent="var(--gt-correct)" highlight />
              <GTBar label="1" pct={64} value="29%" accent="var(--gt-correct)" highlight />
              <GTBar label="2" pct={40} value="18%" accent="var(--gt-correct)" highlight />
              <GTBar label="3" pct={26} value="12%" accent="var(--gt-correct)" highlight />
            </div>
            <p style={{ margin: '18px 0 0', fontSize: 13, color: 'var(--gt-text-3)' }}>41% des gagnants ont trouvé sans aucun indice.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Profile ---------- */
function ProfileView() {
  const perGame = [
    { game: 'film', played: 98, win: 81, streak: 12 },
    { game: 'serie', played: 76, win: 58, streak: 5 },
    { game: 'face', played: 64, win: 39, streak: 0 },
  ];
  return (
    <div className="gt-root" style={{ width: 1440, minHeight: 1080 }}>
      <GTWebNav active="hub" />
      <div style={{ padding: '40px 64px 64px' }}>
        {/* header card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-xl)', padding: 32 }}>
          <GTAvatar name="Léa Martin" size={88} hue={300} />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Léa Martin</h1>
            <div style={{ fontSize: 14.5, color: 'var(--gt-text-3)', marginTop: 4 }}>@leamartin · Membre depuis janvier 2026</div>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <GTStat value="238" label="parties jouées" />
            <GTStat value="178" label="victoires" accent="var(--gt-correct)" />
            <GTStat value="75%" label="taux de victoire" />
            <GTStreak days={12} size="lg" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, marginTop: 24, alignItems: 'start' }}>
          {/* per-game stats — dynamic, not hardwired */}
          <div>
            <GTSectionHead title="Stats par jeu" action="Mis à jour dynamiquement" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {perGame.map((p) => {
                const m = GAME_META[p.game];
                return (
                  <div key={p.game} className={m.cls} style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: '20px 24px' }}>
                    <span style={{ width: 48, height: 48, borderRadius: 'var(--gt-r-md)', background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}>
                      <GameGlyph game={m.glyph} size={26} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 17 }}>{m.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--gt-text-3)' }}>{p.played} parties · {p.win} victoires</div>
                    </div>
                    {/* win rate bar */}
                    <div style={{ width: 200 }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--gt-surface-3)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(p.win / p.played * 100)}%`, height: '100%', background: 'var(--acc)' }} />
                      </div>
                      <div className="gt-mono" style={{ fontSize: 11, color: 'var(--gt-text-3)', marginTop: 5 }}>{Math.round(p.win / p.played * 100)}% de victoire</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div className="gt-mono" style={{ fontSize: 20, fontWeight: 700, color: p.streak ? 'var(--gt-warn)' : 'var(--gt-text-4)' }}>{p.streak || '–'}</div>
                      <div style={{ fontSize: 11, color: 'var(--gt-text-3)' }}>série</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* history */}
          <aside>
            <GTSectionHead title="Historique" />
            <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 8 }}>
              {[
                { game: 'film', r: '3/5', won: true, d: 'Aujourd\'hui' },
                { game: 'serie', r: '4/5', won: true, d: 'Aujourd\'hui' },
                { game: 'face', r: 'X/5', won: false, d: 'Hier' },
                { game: 'film', r: '2/5', won: true, d: 'Hier' },
                { game: 'serie', r: '5/5', won: true, d: '26 mai' },
              ].map((h, i) => {
                const m = GAME_META[h.game];
                return (
                  <div key={i} className={m.cls} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < 4 ? '1px solid var(--gt-line)' : 'none' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}>
                      <GameGlyph game={m.glyph} size={16} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gt-text-4)' }}>{h.d}</div>
                    </div>
                    <GTBadge tone={h.won ? 'success' : 'danger'}>{h.r}</GTBadge>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ---------- Leaderboard ---------- */
function LeaderboardView() {
  const rows = [
    { r: 1, name: 'Karim Benali', pts: 142, avg: '2.8', hue: 40, d: 'up' },
    { r: 2, name: 'Sofia Rossi', pts: 138, avg: '3.0', hue: 200, d: 'up' },
    { r: 3, name: 'Léa Martin', pts: 131, avg: '3.2', hue: 300, me: true, d: 'down' },
    { r: 4, name: 'Tom Dubois', pts: 119, avg: '3.5', hue: 150, d: 'same' },
    { r: 5, name: 'Marie Chen', pts: 112, avg: '3.6', hue: 90, d: 'up' },
    { r: 6, name: 'Yanis Petit', pts: 104, avg: '3.9', hue: 260, d: 'down' },
    { r: 7, name: 'Emma Leroy', pts: 98, avg: '4.0', hue: 340, d: 'same' },
  ];
  const arrow = { up: { c: 'var(--gt-correct)', s: '▲' }, down: { c: 'var(--gt-wrong)', s: '▼' }, same: { c: 'var(--gt-text-4)', s: '–' } };
  return (
    <div className="gt-root" style={{ width: 1440, minHeight: 1080 }}>
      <GTWebNav active="leader" />
      <div style={{ padding: '40px 64px 64px', maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>Classement amis</h1>
            <p style={{ margin: '8px 0 0', fontSize: 15.5, color: 'var(--gt-text-2)' }}>Basé sur les victoires et le score moyen (moins d'essais = mieux).</p>
          </div>
          <div style={{ display: 'flex', gap: 6, background: 'var(--gt-surface)', borderRadius: 'var(--gt-r-pill)', padding: 4, border: '1px solid var(--gt-line)' }}>
            <span style={{ padding: '8px 18px', borderRadius: 'var(--gt-r-pill)', fontSize: 14, fontWeight: 600, background: 'var(--gt-surface-3)', color: 'var(--gt-text)' }}>Hebdomadaire</span>
            <span style={{ padding: '8px 18px', borderRadius: 'var(--gt-r-pill)', fontSize: 14, fontWeight: 500, color: 'var(--gt-text-3)' }}>Mensuel</span>
          </div>
        </div>

        {/* podium */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 18, marginBottom: 32 }}>
          {[rows[1], rows[0], rows[2]].map((p, idx) => {
            const h = [128, 168, 108][idx];
            const medal = ['var(--gt-text-2)', 'var(--gt-warn)', 'oklch(0.62 0.12 50)'][idx];
            return (
              <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 150 }}>
                <GTAvatar name={p.name} size={idx === 1 ? 64 : 52} hue={p.hue} ring={medal} />
                <div style={{ fontWeight: 700, fontSize: 14, textAlign: 'center' }}>{p.name}{p.me && ' (toi)'}</div>
                <div style={{ width: '100%', height: h, borderRadius: '12px 12px 0 0', background: `linear-gradient(180deg, color-mix(in oklab, ${medal} 30%, var(--gt-surface)), var(--gt-surface))`, border: '1px solid var(--gt-line)', borderBottom: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <div className="gt-mono" style={{ fontSize: 28, fontWeight: 700, color: medal }}>{p.r}</div>
                  <div className="gt-mono" style={{ fontSize: 14, fontWeight: 600 }}>{p.pts} pts</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* full table */}
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 100px 60px', padding: '12px 20px', fontSize: 12, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--gt-line)' }}>
            <span>#</span><span>Joueur</span><span style={{ textAlign: 'right' }}>Victoires</span><span style={{ textAlign: 'right' }}>Moy.</span><span style={{ textAlign: 'right' }}>Évol.</span>
          </div>
          {rows.map((p) => (
            <div key={p.r} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 100px 60px', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--gt-line)', background: p.me ? 'var(--gt-surface-2)' : 'transparent' }}>
              <span className="gt-mono" style={{ fontSize: 15, fontWeight: 700, color: p.r <= 3 ? 'var(--gt-warn)' : 'var(--gt-text-3)' }}>{p.r}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <GTAvatar name={p.name} size={34} hue={p.hue} />
                <span style={{ fontSize: 15, fontWeight: p.me ? 700 : 500 }}>{p.name}{p.me && ' (toi)'}</span>
              </span>
              <span className="gt-mono" style={{ textAlign: 'right', fontSize: 15, fontWeight: 600 }}>{p.pts}</span>
              <span className="gt-mono" style={{ textAlign: 'right', fontSize: 14, color: 'var(--gt-text-2)' }}>{p.avg}</span>
              <span className="gt-mono" style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: arrow[p.d].c }}>{arrow[p.d].s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Friends management ---------- */
function FriendsView() {
  return (
    <div className="gt-root" style={{ width: 1440, minHeight: 1080 }}>
      <GTWebNav active="friends" />
      <div style={{ padding: '40px 64px 64px', maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>Amis</h1>
        <p style={{ margin: '8px 0 24px', fontSize: 15.5, color: 'var(--gt-text-2)' }}>Recherche par pseudo, gère tes invitations et ta liste d'amis.</p>

        {/* search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', maxWidth: 520 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <span style={{ flex: 1, fontSize: 15, color: 'var(--gt-text-4)' }}>Rechercher un pseudo…</span>
          <GTButton variant="primary" size="sm">Inviter</GTButton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginTop: 32, alignItems: 'start' }}>
          {/* friends list */}
          <div>
            <GTSectionHead title="Mes amis (14)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { name: 'Karim Benali', u: 'karimb', hue: 40, streak: 18 },
                { name: 'Sofia Rossi', u: 'sofiar', hue: 200, streak: 9 },
                { name: 'Tom Dubois', u: 'tomd', hue: 150, streak: 4 },
                { name: 'Marie Chen', u: 'mariec', hue: 90, streak: 22 },
                { name: 'Yanis Petit', u: 'yanisp', hue: 260, streak: 0 },
                { name: 'Emma Leroy', u: 'emmal', hue: 340, streak: 7 },
              ].map((f) => (
                <div key={f.u} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '14px 16px' }}>
                  <GTAvatar name={f.name} size={40} hue={f.hue} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)' }}>@{f.u}</div>
                  </div>
                  {f.streak > 0 && <GTStreak days={f.streak} />}
                </div>
              ))}
            </div>
          </div>

          {/* invitations */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <GTSectionHead title="Reçues (2)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[{ name: 'Lucas Marin', u: 'lucasm', hue: 20 }, { name: 'Nora Haddad', u: 'norah', hue: 180 }].map((f) => (
                  <div key={f.u} style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <GTAvatar name={f.name} size={38} hue={f.hue} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>@{f.u}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <GTButton variant="primary" size="sm" full>Accepter</GTButton>
                      <GTButton variant="soft" size="sm" full>Refuser</GTButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <GTSectionHead title="Envoyées (1)" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '14px 16px' }}>
                <GTAvatar name="Hugo Blanc" size={38} hue={120} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Hugo Blanc</div>
                  <div style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>@hugob</div>
                </div>
                <GTBadge tone="warn">En attente</GTBadge>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ResultView, StatsView, ProfileView, LeaderboardView, FriendsView, ShareCompareView });

/* ---------- Share cards comparison (single vs. combined day) ---------- */
function ShareCompareView() {
  return (
    <div className="gt-root" style={{ width: 900, minHeight: 620, padding: 40, display: 'flex', gap: 36, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <GTBadge style={{ marginBottom: 14 }}>Partage d'un jeu</GTBadge>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>Carte d'un défi</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--gt-text-3)' }}>Après une partie, partage ce jeu précis.</p>
        <GTShareCard game="film" won attempts={3} hintsUsed={2} width={360} />
      </div>
      <div style={{ flex: 1 }}>
        <GTBadge tone="accent" style={{ marginBottom: 14 }}>Nouveau · partage combiné</GTBadge>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>Carte « Ma journée »</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--gt-text-3)' }}>Tous les défis du jour en une carte — un seul partage.</p>
        <GTDailyShareCard width={360} results={[
          { game: 'film', won: true, attempts: 3 },
          { game: 'serie', won: true, attempts: 4 },
          { game: 'face', won: false, attempts: 5 },
        ]} />
      </div>
    </div>
  );
}
