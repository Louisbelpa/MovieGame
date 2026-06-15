/* GuessToday — signature components: GameCard, AttemptGrid, HintCard,
   GuessInput (autocomplete), ShareCard. Exports to window. */

/* ---------- Game card (the extensible hub component) ---------- */
// Generic: takes a game key + day status. Works for any game type.
function GTGameCard({ game, status = 'todo', attempts, total = 5, won, footnote, compact }) {
  const m = GAME_META[game];
  const statusMap = {
    todo:    { label: 'Pas encore joué', tone: 'neutral', cta: 'Jouer' },
    progress:{ label: `Essai ${attempts}/${total}`, tone: 'warn', cta: 'Continuer' },
    done:    { label: won ? `Résolu en ${attempts}` : 'Non trouvé', tone: won ? 'success' : 'danger', cta: 'Revoir' },
  }[status];
  return (
    <div className={m.cls} style={{
      position: 'relative', borderRadius: 'var(--gt-r-lg)', overflow: 'hidden',
      background: 'var(--gt-surface)', border: '1px solid var(--gt-line)',
      display: 'flex', flexDirection: 'column', minWidth: 0,
    }}>
      {/* accent top strip + glow */}
      <div style={{ height: 4, background: 'var(--acc)' }} />
      {/* thumbnail / glyph zone */}
      <div className="gt-ph" style={{
        height: compact ? 96 : 132, position: 'relative',
        background: `radial-gradient(120% 100% at 50% 0%, var(--acc-dim), transparent 70%), var(--gt-surface-2)`,
        backgroundImage: 'none',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--gt-r-md)', background: 'var(--acc-dim)',
          color: 'var(--acc)', display: 'grid', placeItems: 'center',
        }}>
          <GameGlyph game={m.glyph} size={28} />
        </div>
        {status === 'done' && (
          <span style={{ position: 'absolute', top: 12, right: 12 }}>
            <GTBadge tone={won ? 'success' : 'danger'}>{won ? '✓ Gagné' : '✕ Perdu'}</GTBadge>
          </span>
        )}
      </div>
      {/* body */}
      <div style={{ padding: compact ? '14px 16px 16px' : '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: compact ? 16 : 19, letterSpacing: '-0.01em' }}>{m.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)', marginTop: 2 }}>{m.label} · du jour</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <GTBadge tone={statusMap.tone}>{statusMap.label}</GTBadge>
          <GTButton variant="accent" size="sm">{statusMap.cta}</GTButton>
        </div>
        {footnote && <div style={{ fontSize: 12, color: 'var(--gt-text-4)' }}>{footnote}</div>}
      </div>
    </div>
  );
}

/* ---------- Attempt grid (Wordle-style, adapted for long titles) ---------- */
// Each attempt is a full-width row (titles are long), colored by result.
function GTAttemptRow({ text, state = 'empty', icon }) {
  const styles = {
    empty:  { background: 'var(--gt-surface)', border: '1px dashed var(--gt-line-2)', color: 'var(--gt-text-4)' },
    wrong:  { background: 'var(--gt-wrong-dim)', border: '1px solid color-mix(in oklab, var(--gt-wrong) 35%, transparent)', color: 'var(--gt-text)' },
    skip:   { background: 'var(--gt-surface-2)', border: '1px solid var(--gt-line)', color: 'var(--gt-text-3)' },
    correct:{ background: 'var(--gt-correct-dim)', border: '1px solid color-mix(in oklab, var(--gt-correct) 45%, transparent)', color: 'var(--gt-text)' },
    active: { background: 'var(--gt-surface-2)', border: '1px solid var(--acc, var(--gt-line-2))', color: 'var(--gt-text)' },
  }[state];
  const dot = { wrong: 'var(--gt-wrong)', correct: 'var(--gt-correct)', skip: 'var(--gt-text-4)' }[state];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
      borderRadius: 'var(--gt-r-md)', fontSize: 15, fontWeight: 500, minHeight: 50,
      ...styles,
    }}>
      <span style={{
        width: 20, height: 20, flex: '0 0 auto', borderRadius: '50%',
        display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
        background: dot ? 'transparent' : 'transparent', color: dot || 'var(--gt-text-4)',
        border: state === 'empty' || state === 'active' ? '1.5px solid currentColor' : 'none',
      }}>
        {state === 'correct' ? '✓' : state === 'wrong' ? '✕' : state === 'skip' ? '–' : ''}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {text || <span style={{ color: 'var(--gt-text-4)' }}>—</span>}
      </span>
      {state === 'wrong' && <span style={{ fontSize: 12, color: 'var(--gt-wrong)', fontWeight: 600 }}>Incorrect</span>}
      {state === 'skip' && <span style={{ fontSize: 12, color: 'var(--gt-text-4)', fontWeight: 600 }}>Passé</span>}
      {state === 'correct' && <span style={{ fontSize: 12, color: 'var(--gt-correct)', fontWeight: 600 }}>Trouvé !</span>}
    </div>
  );
}

function GTAttemptGrid({ rows, total = 5 }) {
  const filled = rows || [];
  const items = [];
  for (let i = 0; i < total; i++) {
    items.push(filled[i] || { state: 'empty', text: '' });
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((r, i) => <GTAttemptRow key={i} {...r} />)}
    </div>
  );
}

/* ---------- Hint card (progressive reveal, flip-style) ---------- */
function GTHintCard({ index, label, value, revealed }) {
  if (!revealed) {
    return (
      <div style={{
        flex: 1, minWidth: 0, padding: '14px 16px', borderRadius: 'var(--gt-r-md)',
        background: 'var(--gt-surface)', border: '1px dashed var(--gt-line-2)',
        display: 'flex', flexDirection: 'column', gap: 6, opacity: .65,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gt-text-4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Indice {index}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gt-text-4)', fontSize: 13.5 }}>
          <span style={{ fontSize: 14 }}>🔒</span> Révélé au prochain essai
        </div>
      </div>
    );
  }
  return (
    <div className="gt-flip" style={{
      flex: 1, minWidth: 0, padding: '14px 16px', borderRadius: 'var(--gt-r-md)',
      background: 'var(--acc-dim)', border: '1px solid color-mix(in oklab, var(--acc) 35%, transparent)',
      display: 'flex', flexDirection: 'column', gap: 6,
      animation: 'gt-flip-in .5s ease both', transformOrigin: 'top',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gt-text)' }}>{value}</div>
    </div>
  );
}

/* ---------- Guess input with autocomplete ---------- */
function GTGuessInput({ value = '', placeholder = 'Tape le titre…', suggestions, accent, disabled }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)',
        border: `1.5px solid ${value ? 'var(--acc, var(--gt-line-2))' : 'var(--gt-line)'}`,
        opacity: disabled ? .5 : 1,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <span style={{ flex: 1, fontSize: 15, color: value ? 'var(--gt-text)' : 'var(--gt-text-4)' }}>
          {value || placeholder}{value && <span style={{ color: 'var(--acc)', fontWeight: 600 }}>|</span>}
        </span>
        <GTButton variant="accent" size="sm">Valider</GTButton>
      </div>
      {suggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 5,
          background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)',
          border: '1px solid var(--gt-line-2)', boxShadow: 'var(--gt-shadow)', overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: i === 0 ? 'var(--gt-surface-3)' : 'transparent',
              borderBottom: i < suggestions.length - 1 ? '1px solid var(--gt-line)' : 'none',
            }}>
              <div className="gt-ph" style={{ width: 32, height: 44, borderRadius: 4, flex: '0 0 auto', fontSize: 8 }}>img</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--gt-text)' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>{s.meta}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Shareable score card (no spoiler) ---------- */
function GTShareCard({ game, won, attempts = 4, total = 5, day = 142, hintsUsed = 2, width = 360 }) {
  const m = GAME_META[game];
  // squares: solid accent for the winning try, gray for wrong/skip, outline for unused
  const squares = [];
  for (let i = 0; i < total; i++) {
    let kind = 'unused';
    if (won) { kind = i < attempts - 1 ? 'wrong' : i === attempts - 1 ? 'win' : 'unused'; }
    else { kind = i < attempts ? 'wrong' : 'unused'; }
    squares.push(kind);
  }
  return (
    <div className={m.cls} style={{
      width, borderRadius: 'var(--gt-r-lg)', overflow: 'hidden',
      background: `linear-gradient(160deg, var(--gt-surface) 0%, var(--gt-bg-2) 100%)`,
      border: '1px solid var(--gt-line-2)', position: 'relative',
    }}>
      <div style={{ height: 5, background: 'var(--acc)' }} />
      <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <GTLogo size={18} />
          <span className="gt-mono" style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>#{day}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 38, height: 38, borderRadius: 'var(--gt-r-sm)', background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}>
            <GameGlyph game={m.glyph} size={22} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{m.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--gt-text-3)' }}>{m.label} · 28 mai 2026</div>
          </div>
        </div>
        {/* squares */}
        <div style={{ display: 'flex', gap: 8 }}>
          {squares.map((k, i) => (
            <div key={i} style={{
              flex: 1, aspectRatio: '1', borderRadius: 8,
              background: k === 'win' ? 'var(--acc)' : k === 'wrong' ? 'var(--gt-surface-3)' : 'transparent',
              border: k === 'unused' ? '2px solid var(--gt-line)' : 'none',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="gt-mono" style={{ fontSize: 26, fontWeight: 700, color: won ? 'var(--acc)' : 'var(--gt-wrong)' }}>
            {won ? `${attempts}/${total}` : `X/${total}`}
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--gt-text-3)' }}>
            {hintsUsed} indice{hintsUsed > 1 ? 's' : ''} utilisé{hintsUsed > 1 ? 's' : ''}<br/>
            <span style={{ color: 'var(--gt-text-4)' }}>guesstoday.app</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GTGameCard, GTAttemptRow, GTAttemptGrid, GTHintCard, GTGuessInput, GTShareCard });
