/* GuessToday — CANDY mobile : écrans manquants (onboarding, auth, landing, menu, stats, résultat, amis). */
const GlyphE = window.GlyphC;
const CFG_E = window.GAME_CFG;
const MHeaderE = window.MHeader;
const MTabBarE = window.MTabBar;
const DailyCardE = window.CandyDailyShareCard;
const MobileGameBodyE = window.MobileGameBody;

/* ----------------------------- ONBOARDING ----------------------------- */
const ONB = [
  { g: 'film', glyph: 'film', title: 'Un défi par jour', body: 'Trois jeux de devinettes, renouvelés chaque jour à minuit. Tout le monde joue le même défi.' },
  { g: 'serie', glyph: 'serie', title: '5 essais, 3 indices', body: 'Devine le titre ou la personnalité. Bloqué ? Un indice se dévoile à chaque essai raté.' },
  { g: 'face', glyph: 'face', title: 'Joue avec tes amis', body: 'Compare tes scores, grimpe au classement et partage ta journée en une seule carte.' },
];
function MobileOnboarding({ slide = 0 }) {
  const s = ONB[slide];
  return (
    <div className={`cdym g-${s.g}`}>
      <div className="cdym-onb">
        <span className="cdym-onb-skip">Passer</span>
        <div className="cdym-onb-art"><div className="cdym-onb-card"><GlyphE game={s.glyph} size={84} /></div></div>
        <h2 className="cdym-onb-h">{s.title}</h2>
        <p className="cdym-onb-b">{s.body}</p>
        <div className="cdym-onb-dots">{ONB.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}</div>
        <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '16px' }}>{slide === 2 ? 'Commencer à jouer' : 'Suivant'}</button>
      </div>
    </div>
  );
}

/* -------------------------------- AUTH -------------------------------- */
function MobileAuth({ mode = 'signup' }) {
  const signup = mode === 'signup';
  return (
    <div className="cdym g-film">
      <div className="cdym-auth">
        <span className="cdym-auth-logo"><span className="d">?</span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
        <h1 className="cdym-auth-h">{signup ? 'Crée ton compte' : 'Bon retour !'}</h1>
        <p className="cdym-auth-sub">{signup ? 'Garde ta série, tes stats et défie tes amis.' : 'Connecte-toi pour reprendre ta série.'}</p>
        <div className="cdym-social">
          <button className="dark"> Continuer avec Apple</button>
          <button><span style={{ fontWeight: 800, color: '#4285F4' }}>G</span> Continuer avec Google</button>
        </div>
        <div className="cdym-divider">ou avec un e-mail</div>
        {signup && (
          <div className="cdym-field"><label>Pseudo</label><div className="box ph">marius</div></div>
        )}
        <div className="cdym-field"><label>E-mail</label><div className="box ph">marius@email.com</div></div>
        <div className="cdym-field"><label>Mot de passe</label><div className="box">{signup ? '' : ''}<span className="dots">••••••••</span></div></div>
        <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '16px', marginTop: 6 }}>{signup ? 'Créer mon compte' : 'Se connecter'}</button>
        <div className="cdym-auth-foot">{signup ? <span>Déjà un compte ? <b>Se connecter</b></span> : <span>Pas de compte ? <b>Créer un compte</b></span>}</div>
        {signup && <p className="cdym-auth-legal">En continuant, tu acceptes les Conditions d'utilisation et la Politique de confidentialité.</p>}
      </div>
    </div>
  );
}

/* ------------------------------ LANDING ------------------------------- */
function MobileLanding() {
  const cards = [['film', 'FilmGuess', 'Le film du jour'], ['serie', 'SerieGuess', 'La série du jour'], ['face', 'FaceGuess', 'La personnalité du jour']];
  return (
    <div className="cdym g-film">
      <div className="cdym-lhead">
        <span className="cdym-logo"><span className="d">?</span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
        <span className="cdym-burger"><span /><span /><span /></span>
      </div>
      <div className="cdym-scroll">
        <div className="cdym-hero">
          <span className="eyebrow">🎬 Le rendez-vous quotidien</span>
          <h1>Trois devinettes.<br /><span className="c1">Une par jour.</span></h1>
          <p>Films, séries, personnalités. 5 essais, des indices, et un score à comparer avec tes amis.</p>
        </div>
        <div className="cdym-hero-cta">
          <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '16px' }}>Créer un compte gratuit</button>
          <button className="cdym-btn cdym-btn-soft cdym-btn-block">Voir le défi du jour</button>
        </div>
        <div className="cdym-hero-stats">
          <div><b style={{ color: 'var(--coral)' }}>142</b><span>jours</span></div>
          <div><b style={{ color: 'var(--grape)' }}>28k</b><span>joueurs/j</span></div>
          <div><b style={{ color: 'var(--sky)' }}>3</b><span>jeux</span></div>
        </div>
        <div className="cdym-deck">
          {cards.map(([g, n, s]) => (
            <div key={g} className={`cdym-deckcard g-${g}`}>
              <span className="g"><GlyphE game={g} size={26} /></span>
              <div><div className="n">{n}</div><div className="s">{s}</div></div>
            </div>
          ))}
        </div>
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

/* ------------------------------- MENU --------------------------------- */
function MobileMenu() {
  const links = [['jeux', '🎮', 'Jeux du jour', true], ['stats', '📊', 'Stats'], ['classement', '🏆', 'Classement'], ['amis', '👥', 'Amis'], ['params', '⚙️', 'Réglages']];
  return (
    <div className="cdym g-film" style={{ position: 'relative' }}>
      <MobileHubBehind />
      <div className="cdym-drawer-scrim" />
      <div className="cdym-drawer">
        <div className="cdym-drawer-top">
          <span className="av">MR</span>
          <div style={{ flex: 1 }}><div className="n">Marius R.</div><div className="u">@mariusr</div></div>
          <span className="cdym-drawer-x">✕</span>
        </div>
        {links.map(([k, ic, l, on]) => (
          <div key={k} className={`cdym-drawer-link${on ? ' on' : ''}`}><span className="ic">{ic}</span>{l}</div>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '2.5px solid var(--line)' }}>
          <div className="cdym-drawer-link" style={{ color: 'var(--ink-2)' }}><span className="ic">↩</span>Se déconnecter</div>
        </div>
      </div>
    </div>
  );
}
function MobileHubBehind() {
  return (
    <React.Fragment>
      <MHeaderE />
      <div className="cdym-scroll" style={{ filter: 'blur(1px)', opacity: .6 }}>
        <div className="cdym-ph"><h1>Salut Marius 👋</h1><div className="sub">Jeudi 28 mai · Défi #142</div></div>
      </div>
    </React.Fragment>
  );
}

/* ------------------------------- STATS -------------------------------- */
function MobileStats({ guest = false }) {
  const dist = [['1', 6, 'var(--coral)'], ['2', 18, 'var(--coral)'], ['3', 28, 'var(--mint)'], ['4', 20, 'var(--coral)'], ['5', 10, 'var(--coral)'], ['X', 18, 'var(--wrong)']];
  const max = 28;
  return (
    <div className="cdym g-film">
      <MHeaderE />
      <div className="cdym-scroll">
        {guest && (
          <div className="cdym-guest-strip">
            <span className="e">👋</span>
            <div style={{ flex: 1, minWidth: 0 }}><div className="t">Stats publiques du jour</div><div className="s">Crée un compte pour suivre tes stats.</div></div>
            <button className="cdym-btn cdym-btn-primary" style={{ padding: '9px 13px', fontSize: 13 }}>Compte</button>
          </div>
        )}
        <div className="cdym-ph"><h1>Stats du jour 📊</h1><div className="sub">FilmGuess · #142</div></div>
        <div className="cdym-stat-grid">
          <div className="cdym-stat-t"><div className="v" style={{ color: 'var(--mint)' }}>72%</div><div className="l">taux de victoire</div></div>
          <div className="cdym-stat-t"><div className="v" style={{ color: 'var(--coral)' }}>3,4</div><div className="l">essais en moyenne</div></div>
          <div className="cdym-stat-t"><div className="v">28 412</div><div className="l">joueurs aujourd'hui</div></div>
          <div className="cdym-stat-t"><div className="v" style={{ color: 'var(--grape)' }}>1,8</div><div className="l">indices en moyenne</div></div>
        </div>
        <div className="cdym-card-m">
          <h3>Répartition des tentatives</h3>
          {dist.map(([k, v, c]) => (
            <div key={k} className="cdym-barrow"><span className="k">{k}</span><div className="tr"><div className="fl" style={{ width: (v / max * 100) + '%', background: c }}>{v}%</div></div></div>
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>
      <MTabBarE active="stats" />
    </div>
  );
}

/* ------------------------------ RESULT -------------------------------- */
function MobileResult() {
  return (
    <div className="cdym g-film">
      <MHeaderE />
      <div className="cdym-scroll">
        <div className="cdym-result">
          <span className="cdym-res-tag">✓ RÉSOLU EN 3/5</span>
          <div className="cdym-res-score">3<span>/ 5 essais</span></div>
          <div className="cdym-res-answer">
            <span className="cdym-res-poster">AFFICHE</span>
            <div><div className="l">La réponse était</div><div className="t">Interstellar</div></div>
          </div>
          <div className="cdym-mono" style={{ fontSize: 11, color: 'var(--ink-2)', alignSelf: 'flex-start', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Ta carte « Ma journée »</div>
          {DailyCardE ? <DailyCardE width={330} /> : null}
          <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '15px' }}>Partager ma journée</button>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="cdym-btn cdym-btn-soft" style={{ flex: 1 }}>Stats du jour</button>
            <button className="cdym-btn cdym-btn-soft" style={{ flex: 1 }}>Accueil</button>
          </div>
        </div>
      </div>
      <MTabBarE active="jeux" />
    </div>
  );
}

/* ------------------------------- FRIENDS ------------------------------ */
function MobileFriends() {
  const initials = (n) => n.split(' ').map((x) => x[0]).join('');
  const friends = [['Karim Benali', 'karimb', 40, 18], ['Sofia Rossi', 'sofiar', 200, 9], ['Tom Dubois', 'tomd', 150, 4], ['Marie Chen', 'mariec', 90, 22]];
  const inv = [['Lucas Marin', 'lucasm', 20], ['Nora Haddad', 'norah', 180]];
  return (
    <div className="cdym g-film">
      <MHeaderE />
      <div className="cdym-scroll">
        <div className="cdym-ph"><h1>Mes amis 👥</h1></div>
        <div className="cdym-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span className="ph">Rechercher un pseudo…</span>
          <button className="cdym-btn cdym-btn-primary" style={{ padding: '9px 14px' }}>Inviter</button>
        </div>
        <div className="cdym-sec-t">Invitations reçues (2)</div>
        <div className="cdym-list" style={{ paddingTop: 0 }}>
          {inv.map(([n, u, h]) => (
            <div key={u} className="cdym-friend">
              <span className="av" style={{ background: `oklch(0.66 0.16 ${h})` }}>{initials(n)}</span>
              <div style={{ flex: 1 }}><div className="n">{n}</div><div className="u">@{u}</div></div>
              <div className="cdym-inv-actions"><button className="cdym-iconbtn ok">✓</button><button className="cdym-iconbtn no">✕</button></div>
            </div>
          ))}
        </div>
        <div className="cdym-sec-t">Mes amis (14)</div>
        <div className="cdym-list" style={{ paddingTop: 0 }}>
          {friends.map(([n, u, h, st]) => (
            <div key={u} className="cdym-friend">
              <span className="av" style={{ background: `oklch(0.66 0.16 ${h})` }}>{initials(n)}</span>
              <div style={{ flex: 1 }}><div className="n">{n}</div><div className="u">@{u}</div></div>
              <span className="cdym-streak-sm">🔥 {st}</span>
            </div>
          ))}
        </div>
        <div className="cdym-sec-t">Invitations envoyées (1)</div>
        <div className="cdym-list" style={{ paddingTop: 0 }}>
          <div className="cdym-friend">
            <span className="av" style={{ background: 'oklch(0.66 0.16 120)' }}>HB</span>
            <div style={{ flex: 1 }}><div className="n">Hugo Blanc</div><div className="u">@hugob</div></div>
            <span className="cdym-pending">En attente</span>
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>
      <MTabBarE active="profil" />
    </div>
  );
}

Object.assign(window, { MobileOnboarding, MobileAuth, MobileLanding, MobileMenu, MobileStats, MobileResult, MobileFriends, MobileGuestArena, MobileGuestWin, MobileLocked });

/* ----- mur d'inscription mobile (pages perso en invité) ----- */
const MLOCK = {
  classement: { active: 'classement', icon: '🏆', title: 'Classement entre amis', body: 'Crée un compte pour rejoindre le classement et défier tes amis.', perks: ['🏆 Ton rang', '👥 Tes amis'] },
  profil: { active: 'profil', icon: '👤', title: 'Ton profil t\'attend', body: 'Crée un compte pour sauvegarder ta série, tes stats et ton historique.', perks: ['🔥 Ta série', '📊 Tes stats'] },
  amis: { active: 'profil', icon: '👥', title: 'Joue avec tes amis', body: 'Crée un compte pour ajouter des amis et comparer vos scores.', perks: ['➕ Ajouter', '⚔️ Défis'] },
};
function MobileLocked({ page = 'profil' }) {
  const cfg = MLOCK[page];
  return (
    <div className="cdym g-film">
      <MHeaderE />
      <div className="cdym-locked">
        <div className="lk">{cfg.icon}</div>
        <h2>{cfg.title}</h2>
        <p>{cfg.body}</p>
        <div className="cdym-locked-perks">{cfg.perks.map((p) => <span className="cdym-locked-perk" key={p}>{p}</span>)}</div>
        <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '15px' }}>Créer un compte gratuit</button>
        <span className="cdym-locked-ghost">J'ai déjà un compte · Se connecter</span>
      </div>
      <MTabBarE active={cfg.active} />
    </div>
  );
}

Object.assign(window, { MobileLocked });

/* --------------------- ARCHIVE mobile (calendrier des défis) --------------------- */
function MobileArchive({ today = 28, monthDays = 31, firstDow = 4, month = 'Mai 2026' }) {
  const dayResult = (d) => {
    const r = (n) => { const x = Math.sin((d + 1) * (n + 3) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    return [0, 1, 2].map((g) => {
      if (d > today) return 'none';
      if (d === today && g > 0) return 'none';
      const v = r(g);
      return v < 0.62 ? 'win' : v < 0.82 ? 'lose' : 'none';
    });
  };
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= monthDays; d++) cells.push(d);
  return (
    <div className="cdym g-film">
      <MHeaderE />
      <div className="cdym-scroll">
        <div className="cdym-arch-head">
          <h1>Archive des défis 📅</h1>
          <div className="sub">Rejoue les défis que tu as manqués — chaque jour reste accessible.</div>
        </div>
        <div className="cdym-arch-month">
          <button>‹</button>
          <span className="m">{month}</span>
          <button className="disabled">›</button>
        </div>
        <div className="cdym-cal-dow">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="cdym-cal-grid">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="cdym-cal-day empty" />;
            const res = dayResult(d);
            const isToday = d === today; const isFuture = d > today;
            const full = !isFuture && res.every((r) => r !== 'none');
            const cls = ['cdym-cal-day', isToday ? 'today' : '', isFuture ? 'future' : '', full ? 'full' : ''].filter(Boolean).join(' ');
            return (
              <div key={i} className={cls}>
                <span className="dn">{d}</span>
                {!isFuture && <span className="dots">{res.map((r, j) => <i key={j} className={r} />)}</span>}
              </div>
            );
          })}
        </div>
        <div className="cdym-arch-legend">
          <span><i className="win" /> Trouvé</span>
          <span><i className="lose" /> Manqué</span>
          <span><i className="none" /> Non joué</span>
        </div>
        <div style={{ height: 16 }} />
      </div>
      <MTabBarE active="jeux" />
    </div>
  );
}

Object.assign(window, { MobileArchive });

/* --------------------- ÉDITION DE PROFIL (mobile) --------------------- */
const MEDIT_HUES = [300, 30, 200, 150, 90, 260];
function MobileProfileEdit() {
  return (
    <div className="cdym g-film">
      <div className="cdym-lhead">
        <span className="cdym-logo" style={{ fontSize: 17 }}><span className="d">‹</span>Modifier le profil</span>
      </div>
      <div className="cdym-scroll">
        <div className="cdym-edit">
          <div className="cdym-edit-av-row">
            <span className="cdym-edit-av" style={{ background: 'oklch(0.66 0.16 300)', boxShadow: '0 5px 0 oklch(0.5 0.15 300)' }}>LM</span>
            <div className="cdym-edit-hues">
              {MEDIT_HUES.map((h, i) => <span key={h} className={`cdym-edit-hue${i === 0 ? ' on' : ''}`} style={{ background: `oklch(0.66 0.16 ${h})` }} />)}
            </div>
          </div>
          <div className="cdym-sec-t" style={{ paddingLeft: 0 }}>Informations</div>
          <div className="cdym-fld"><label>Nom affiché</label><div className="inp">Léa Martin</div></div>
          <div className="cdym-fld"><label>Pseudo</label><div className="inp">@leamartin</div></div>
          <div className="cdym-fld"><label>E-mail</label><div className="inp">lea.martin@email.com</div></div>
          <div className="cdym-fld"><label>Bio (optionnel)</label><div className="inp ph">Ajoute une bio…</div></div>
          <div className="cdym-sec-t" style={{ paddingLeft: 0 }}>Préférences</div>
          <div className="cdym-toggle-row"><div style={{ flex: 1, minWidth: 0 }}><div className="tt">Rappel quotidien</div><div className="ts">Notif quand les défis sont prêts.</div></div><span className="cdym-toggle on" /></div>
          <div className="cdym-toggle-row"><div style={{ flex: 1, minWidth: 0 }}><div className="tt">Visible au classement</div><div className="ts">Tes amis voient ton score.</div></div><span className="cdym-toggle on" /></div>
          <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '15px', marginTop: 6 }}>Enregistrer</button>
          <span className="cdym-locked-ghost" style={{ color: 'var(--wrong-d)' }}>Supprimer mon compte</span>
        </div>
      </div>
      <MTabBarE active="profil" />
    </div>
  );
}

Object.assign(window, { MobileProfileEdit });

/* --------------------- TUTORIEL "Comment jouer" (mobile) --------------------- */
function MobileTutorial({ game = 'film' }) {
  const cfg = CFG_E[game];
  const intro = { film: 'Devine le film du jour.', serie: 'Devine la série du jour.', face: 'Devine la personnalité — photo floue.' }[game];
  const mediaNote = game === 'face'
    ? 'La photo reste floutée : appuie-toi sur la bio. Reviens chaque jour pour garder ta série 🔥.'
    : 'Reviens chaque jour pour un nouveau défi et garde ta série 🔥.';
  return (
    <div className={`cdym g-${game}`}>
      <div className="cdym-tuto">
        <div className="cdym-tuto-head">
          <span className="ic"><GlyphE game={cfg.glyph} size={24} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><h3>Comment jouer</h3><p>{cfg.name} · {intro}</p></div>
          <span className="cdym-tuto-x">✕</span>
        </div>
        <div className="cdym-tuto-body">

          <div className="cdym-tuto-demo">
            <div className="cdym-tuto-lbl"><span className="n">1</span><span className="tx">Tu as 5 essais</span></div>
            <div className="cdym-ar-slots"><i className="used" /><i className="used" /><i /><i /><i /></div>
            <div className="demo-input">{cfg.placeholder}</div>
          </div>

          <div className="cdym-tuto-demo">
            <div className="cdym-tuto-lbl"><span className="n">2</span><span className="tx">Chaque erreur te rapproche</span></div>
            <div className="demo-board">
              <div className="cdym-ar-row wrong"><i>✕</i><span>{cfg.wrongs[0]}</span><em>{cfg.firstMeta}</em></div>
              <div className="cdym-ar-row correct"><i>✓</i><span>{cfg.answer}</span></div>
            </div>
          </div>

          <div className="cdym-tuto-demo">
            <div className="cdym-tuto-lbl"><span className="n">3</span><span className="tx">Des indices se débloquent</span></div>
            <div className="cdym-ar-hints">
              <div className="cdym-ar-hint on"><span className="hl">{cfg.hints[0].l}</span><span className="hv">{cfg.hints[0].v}</span></div>
              <div className="cdym-ar-hint on"><span className="hl">{cfg.hints[1].l}</span><span className="hv">{cfg.hints[1].v}</span></div>
              <div className="cdym-ar-hint"><span className="hl">Ind. 3</span><span className="hv">🔒</span></div>
            </div>
            <p className="cdym-tuto-note">{mediaNote}</p>
          </div>

        </div>
        <div className="cdym-tuto-foot">
          <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '15px' }}>C'est parti !</button>
          <span className="cdym-locked-ghost">Ne plus afficher</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MobileTutorial });

/* ----- MobileTutorialScreen : jeu flouté en fond + sheet tuto (comme CandyTutorialScreen) ----- */
function MobileTutorialScreen({ game = 'film' }) {
  const cfg = CFG_E[game];
  const intro = {
    film: 'Devine le film du jour.',
    serie: 'Devine la série du jour.',
    face: 'Devine la personnalité — photo floue.',
  }[game];
  const mediaNote = game === 'face'
    ? 'La photo reste floutée : appuie-toi sur la bio. Reviens chaque jour pour garder ta série 🔥.'
    : 'Reviens chaque jour pour un nouveau défi et garde ta série 🔥.';
  return (
    <div className={`cdym g-${game}`} style={{ position: 'relative', height: 850, overflow: 'hidden' }}>
      {/* jeu en arrière-plan — flouté et atténué */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', filter: 'blur(2px)', opacity: 0.38, pointerEvents: 'none' }}>
        <MHeaderE />
        <div className="cdym-scroll"><MobileGameBodyE game={game} state="start" /></div>
        <MTabBarE active="jeux" />
      </div>
      {/* scrim foncé + sheet tutoriel remontant du bas */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(60,48,80,.52)', zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRadius: '22px 22px 0 0', overflow: 'hidden' }}>
          <div className="cdym-tuto-head">
            <span className="ic"><GlyphE game={cfg.glyph} size={24} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><h3>Comment jouer</h3><p>{cfg.name} · {intro}</p></div>
            <span className="cdym-tuto-x">✕</span>
          </div>
          <div className="cdym-tuto-body">
            <div className="cdym-tuto-demo">
              <div className="cdym-tuto-lbl"><span className="n">1</span><span className="tx">Tu as 5 essais</span></div>
              <div className="cdym-ar-slots"><i className="used" /><i className="used" /><i /><i /><i /></div>
              <div className="demo-input">{cfg.placeholder}</div>
            </div>
            <div className="cdym-tuto-demo">
              <div className="cdym-tuto-lbl"><span className="n">2</span><span className="tx">Chaque erreur te rapproche</span></div>
              <div className="demo-board">
                <div className="cdym-ar-row wrong"><i>✕</i><span>{cfg.wrongs[0]}</span><em>{cfg.firstMeta}</em></div>
                <div className="cdym-ar-row correct"><i>✓</i><span>{cfg.answer}</span></div>
              </div>
            </div>
            <div className="cdym-tuto-demo">
              <div className="cdym-tuto-lbl"><span className="n">3</span><span className="tx">Des indices se débloquent</span></div>
              <div className="cdym-ar-hints">
                <div className="cdym-ar-hint on"><span className="hl">{cfg.hints[0].l}</span><span className="hv">{cfg.hints[0].v}</span></div>
                <div className="cdym-ar-hint on"><span className="hl">{cfg.hints[1].l}</span><span className="hv">{cfg.hints[1].v}</span></div>
                <div className="cdym-ar-hint"><span className="hl">Ind. 3</span><span className="hv">🔒</span></div>
              </div>
              <p className="cdym-tuto-note">{mediaNote}</p>
            </div>
          </div>
          <div className="cdym-tuto-foot">
            <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '15px' }}>C'est parti !</button>
            <span className="cdym-locked-ghost">Ne plus afficher</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MobileTutorialScreen });

/* --------------------- GUEST : arène découverte --------------------- */
function MobileGuestArena() {
  return (
    <div className="cdym g-film">
      <div className="cdym-lhead">
        <span className="cdym-logo"><span className="d">?</span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
        <button className="cdym-btn cdym-btn-primary" style={{ marginLeft: 'auto', padding: '9px 14px', fontSize: 13.5 }}>Créer un compte</button>
      </div>
      <div className="cdym-guestbar">
        <span className="e">👋</span>
        <div><div className="t">Tu joues en invité</div><div className="s">Crée un compte pour garder ta série et tes stats.</div></div>
      </div>
      <div className="cdym-scroll"><MobileGameBodyE game="film" state="playing" /></div>
      <MTabBarE active="jeux" />
    </div>
  );
}

/* --------------------- GUEST : fin + mur d'inscription --------------------- */
function MobileGuestWin() {
  return (
    <div className="cdym g-film">
      <MHeaderE />
      <div className="cdym-scroll">
        <div className="cdym-result" style={{ paddingBottom: 8 }}>
          <span className="cdym-res-tag">BIEN JOUÉ !</span>
          <div className="cdym-res-score">3<span>/ 5 essais</span></div>
          <div className="cdym-res-answer">
            <span className="cdym-res-poster">AFFICHE</span>
            <div><div className="l">La réponse était</div><div className="t">Interstellar</div></div>
          </div>
        </div>
        <div className="cdym-wall">
          <div className="f">🔥</div>
          <h3>Ne perds pas ce score</h3>
          <p>Crée un compte gratuit pour sauvegarder ta partie, démarrer ta série et défier tes amis.</p>
          <div className="cdym-wall-perks"><span className="cdym-wall-perk">🔥 Série</span><span className="cdym-wall-perk">📊 Stats</span><span className="cdym-wall-perk">👥 Amis</span></div>
          <button className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '15px' }}>Créer un compte gratuit</button>
          <span className="ghost">Continuer sans compte</span>
        </div>
        <div className="cdym-teaser">
          <div className="cdym-teaser-h">✨ +2 défis t'attendent aujourd'hui</div>
          <div className="cdym-teaser-cards">
            <div className="cdym-mini g-serie"><span className="g"><GlyphE game="serie" size={20} /></span><div><div className="n">SerieGuess</div><div className="s">La série du jour</div></div><span className="lock">🔒</span></div>
            <div className="cdym-mini g-face"><span className="g"><GlyphE game="face" size={20} /></span><div><div className="n">FaceGuess</div><div className="s">La personnalité du jour</div></div><span className="lock">🔒</span></div>
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

Object.assign(window, { MobileGuestArena, MobileGuestWin });
