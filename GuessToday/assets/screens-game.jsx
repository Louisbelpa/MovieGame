/* GuessToday — generic game screen template + FilmGuess & FaceGuess states.
   ONE template (GameScreen); each game is a config-driven variant. */

function GameScreen({
  game, day = '#142', title = 'Le film du jour',
  blurred = false,             // FaceGuess: image stays blurred always
  bio,                          // FaceGuess: partial biography
  state = 'start',             // start | playing | won | lost | loading
  attempts = [], total = 5,
  hints = [], hintsRevealed = 0,
  inputValue = '', suggestions, answer,
}) {
  const m = GAME_META[game];
  const triesUsed = attempts.length;
  const triesLeft = total - triesUsed;

  return (
    <div className={`gt-root ${m.cls}`} style={{ width: 1440, minHeight: 1080 }}>
      <GTWebNav active="hub" />
      <div style={{ padding: '32px 64px 56px', display: 'grid', gridTemplateColumns: '1fr 540px', gap: 48, alignItems: 'start' }}>

        {/* LEFT — media */}
        <div style={{ position: 'sticky', top: 92 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <span style={{ width: 40, height: 40, borderRadius: 'var(--gt-r-sm)', background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}>
              <GameGlyph game={m.glyph} size={24} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{m.name}</div>
              <div className="gt-mono" style={{ fontSize: 12.5, color: 'var(--gt-text-3)' }}>{day} · 28.05.2026</div>
            </div>
            <span style={{ marginLeft: 'auto' }}>
              <GTBadge tone="accent">{m.label}</GTBadge>
            </span>
          </div>

          {/* the image */}
          <div style={{ position: 'relative', borderRadius: 'var(--gt-r-lg)', overflow: 'hidden', border: '1px solid var(--gt-line-2)', aspectRatio: blurred ? '1 / 1' : '16 / 10' }}>
            <div className="gt-ph" style={{ position: 'absolute', inset: 0, fontSize: 13, filter: blurred ? 'blur(28px)' : 'none', transform: blurred ? 'scale(1.15)' : 'none' }}>
              {blurred ? '' : `[ ${m.label.toUpperCase()} — IMAGE NETTE ]\nscène ou affiche du jour`}
            </div>
            {blurred && (
              <>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, transparent, var(--gt-bg-2) 120%)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 36, opacity: .4 }}>👤</div>
                    <div className="gt-mono" style={{ fontSize: 12, color: 'var(--gt-text-3)', marginTop: 6 }}>photo floue · reste floue</div>
                  </div>
                </div>
              </>
            )}
            {state === 'loading' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--gt-bg-2)', display: 'grid', placeItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--gt-line-2)', borderTopColor: 'var(--acc)', animation: 'gt-spin .8s linear infinite' }} />
              </div>
            )}
            {/* reveal overlay on won/lost (films/series sharpen-to-answer; face stays blurred) */}
            {(state === 'won' || state === 'lost') && (
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '40px 20px 18px', background: 'linear-gradient(transparent, var(--gt-bg) 85%)' }}>
                <div style={{ fontSize: 12, color: 'var(--gt-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>La réponse était</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: state === 'won' ? 'var(--gt-correct)' : 'var(--gt-text)' }}>{answer}</div>
              </div>
            )}
          </div>

          {/* FaceGuess biography */}
          {bio && (
            <div style={{ marginTop: 16, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Extrait biographique (vague)</div>
              <p style={{ margin: 0, fontSize: 14.5, color: 'var(--gt-text-2)', lineHeight: 1.55, fontStyle: 'italic' }}>« {bio} »</p>
            </div>
          )}
        </div>

        {/* RIGHT — play column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* attempts counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
            <div style={{ display: 'flex', gap: 5 }}>
              {Array.from({ length: total }).map((_, i) => (
                <span key={i} style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: i < triesUsed ? 'var(--gt-text-3)' : 'var(--acc)',
                  opacity: i < triesUsed ? .5 : 1,
                }} />
              ))}
            </div>
          </div>

          {/* state banner */}
          {state === 'start' && (
            <div style={{ fontSize: 14.5, color: 'var(--gt-text-2)' }}>
              {blurred ? 'Photo volontairement floue. Devine la personnalité à partir de la bio et des indices.' : 'Image affichée en entier. Tu as 5 essais pour trouver le titre.'} <strong style={{ color: 'var(--gt-text)' }}>{triesLeft} essais restants.</strong>
            </div>
          )}
          {(state === 'won' || state === 'lost') && (
            <div className="gt-pop" style={{
              padding: '18px 20px', borderRadius: 'var(--gt-r-md)', display: 'flex', alignItems: 'center', gap: 14,
              background: state === 'won' ? 'var(--gt-correct-dim)' : 'var(--gt-wrong-dim)',
              border: `1px solid color-mix(in oklab, ${state === 'won' ? 'var(--gt-correct)' : 'var(--gt-wrong)'} 35%, transparent)`,
            }}>
              <span style={{ fontSize: 30 }}>{state === 'won' ? '🎉' : '😔'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: state === 'won' ? 'var(--gt-correct)' : 'var(--gt-wrong)' }}>
                  {state === 'won' ? `Bravo ! Trouvé en ${triesUsed}/${total}` : 'Perdu pour aujourd\'hui'}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--gt-text-2)' }}>{state === 'won' ? 'Reviens demain pour un nouveau défi.' : 'Un nouveau défi t\'attend demain.'}</div>
              </div>
            </div>
          )}

          {/* input (hidden when finished) */}
          {(state === 'start' || state === 'playing') && (
            <GTGuessInput value={inputValue} suggestions={suggestions} placeholder={blurred ? 'Nom de la personnalité…' : 'Titre du ' + (game === 'serie' ? 'série' : 'film') + '…'} />
          )}

          {/* attempts grid */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Tes tentatives</div>
            <GTAttemptGrid rows={attempts} total={total} />
          </div>

          {/* hints */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Indices ({hintsRevealed}/{hints.length})</div>
              <span style={{ fontSize: 12, color: 'var(--gt-text-4)' }}>Un indice par essai raté ou passé</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {hints.map((h, i) => (
                <GTHintCard key={i} index={i + 1} label={h.label} value={h.value} revealed={i < hintsRevealed} />
              ))}
            </div>
          </div>

          {/* actions */}
          {(state === 'start' || state === 'playing') ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <GTButton variant="ghost" size="md" style={{ flex: 1 }}>Passer l'essai →</GTButton>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <GTButton variant="accent" size="md" style={{ flex: 1 }}>Partager mon score</GTButton>
              <GTButton variant="soft" size="md" style={{ flex: 1 }}>Stats du jour</GTButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- FilmGuess configs ---- */
const FILM_HINTS = [
  { label: 'Année de sortie', value: '2014' },
  { label: 'Acteur principal', value: 'Matthew McConaughey' },
  { label: 'Réalisateur', value: 'Christopher Nolan' },
];
const FILM_SUGG = [
  { title: 'Interstellar', meta: '2014 · Science-fiction' },
  { title: 'Inception', meta: '2010 · Thriller' },
  { title: 'Inside Out', meta: '2015 · Animation' },
];

function FilmStart() {
  return <GameScreen game="film" state="start" hints={FILM_HINTS} hintsRevealed={0} attempts={[]} inputValue="Inter" suggestions={FILM_SUGG} title="Le film du jour" />;
}
function FilmPlaying() {
  return <GameScreen game="film" state="playing" hints={FILM_HINTS} hintsRevealed={2}
    attempts={[{ state: 'wrong', text: 'Inception' }, { state: 'skip', text: 'Essai passé' }]} title="Le film du jour" />;
}
function FilmWon() {
  return <GameScreen game="film" state="won" answer="Interstellar" hints={FILM_HINTS} hintsRevealed={2}
    attempts={[{ state: 'wrong', text: 'Inception' }, { state: 'skip', text: 'Essai passé' }, { state: 'correct', text: 'Interstellar' }]} title="Le film du jour" />;
}
function FilmLost() {
  return <GameScreen game="film" state="lost" answer="Interstellar" hints={FILM_HINTS} hintsRevealed={3}
    attempts={[{ state: 'wrong', text: 'Inception' }, { state: 'wrong', text: 'Tenet' }, { state: 'skip', text: 'Essai passé' }, { state: 'wrong', text: 'Dune' }, { state: 'wrong', text: 'Arrival' }]} title="Le film du jour" />;
}
function FilmLoading() {
  return <GameScreen game="film" state="loading" hints={FILM_HINTS} hintsRevealed={0} attempts={[]} title="Le film du jour" />;
}

/* ---- FaceGuess (blurred, biography) ---- */
const FACE_HINTS = [
  { label: 'Domaine', value: 'Cinéma' },
  { label: 'Nationalité', value: 'Australienne' },
  { label: 'Fait marquant', value: 'Oscar de la meilleure actrice' },
];
function FacePlaying() {
  return <GameScreen game="face" state="playing" blurred
    bio="Actrice et productrice née dans les années 1960, connue pour des rôles dramatiques récompensés et un engagement dans la production de films indépendants."
    hints={FACE_HINTS} hintsRevealed={2}
    attempts={[{ state: 'wrong', text: 'Naomi Watts' }, { state: 'skip', text: 'Essai passé' }]}
    suggestions={[{ title: 'Cate Blanchett', meta: 'Actrice · 1969' }, { title: 'Nicole Kidman', meta: 'Actrice · 1967' }]}
    title="La personnalité du jour" />;
}

Object.assign(window, { GameScreen, FilmStart, FilmPlaying, FilmWon, FilmLost, FilmLoading, FacePlaying });
