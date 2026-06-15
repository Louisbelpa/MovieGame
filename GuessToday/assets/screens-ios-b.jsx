/* GuessToday — iOS mobile screens (part B): game screens (Film start/playing, Face). */

/* mobile attempts counter dots */
function IOSTriesDots({ used, total = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: i < used ? 'var(--gt-text-3)' : 'var(--acc)', opacity: i < used ? .45 : 1 }} />
      ))}
    </div>
  );
}

/* compact mobile attempt row */
function IOSAttemptRow({ text, state }) {
  const map = {
    wrong:   { bg: 'var(--gt-wrong-dim)', bd: 'color-mix(in oklab, var(--gt-wrong) 35%, transparent)', ic: '✕', icC: 'var(--gt-wrong)' },
    skip:    { bg: 'var(--gt-surface-2)', bd: 'var(--gt-line)', ic: '–', icC: 'var(--gt-text-4)' },
    correct: { bg: 'var(--gt-correct-dim)', bd: 'color-mix(in oklab, var(--gt-correct) 45%, transparent)', ic: '✓', icC: 'var(--gt-correct)' },
    empty:   { bg: 'var(--gt-surface)', bd: 'var(--gt-line)', ic: '', icC: 'var(--gt-text-4)', dash: true },
  }[state];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 'var(--gt-r-md)', background: map.bg, border: `1px ${map.dash ? 'dashed' : 'solid'} ${map.bd}`, minHeight: 46 }}>
      <span style={{ width: 18, height: 18, flex: '0 0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: map.icC, border: map.dash ? '1.5px solid var(--gt-text-4)' : 'none' }}>{map.ic}</span>
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: state === 'empty' ? 'var(--gt-text-4)' : 'var(--gt-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text || '—'}</span>
    </div>
  );
}

/* mobile hint chip */
function IOSHint({ index, label, value, revealed }) {
  if (!revealed) return (
    <div style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--gt-r-md)', background: 'var(--gt-surface)', border: '1px dashed var(--gt-line-2)', opacity: .6, textAlign: 'center' }}>
      <div style={{ fontSize: 16 }}>🔒</div>
      <div style={{ fontSize: 10.5, color: 'var(--gt-text-4)', marginTop: 3 }}>Indice {index}</div>
    </div>
  );
  return (
    <div className="gt-flip" style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--gt-r-md)', background: 'var(--acc-dim)', border: '1px solid color-mix(in oklab, var(--acc) 35%, transparent)', animation: 'gt-flip-in .5s ease both', transformOrigin: 'top' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

/* ---- FilmGuess — start state, with keyboard ---- */
function IOSFilmStart() {
  return (
    <IOSDevice dark keyboard>
      <div className="gt-root gt-film" style={{ background: 'var(--gt-bg)', minHeight: '100%', padding: '56px 18px 12px', color: 'var(--gt-text)' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20, color: 'var(--gt-text-3)' }}>‹</span>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}><GameGlyph game="film" size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>FilmGuess</div>
            <div className="gt-mono" style={{ fontSize: 11, color: 'var(--gt-text-3)' }}>#142</div>
          </div>
          <IOSTriesDots used={0} />
        </div>
        {/* image */}
        <div className="gt-ph" style={{ height: 168, borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', fontSize: 11, marginBottom: 14, whiteSpace: 'pre-line', textAlign: 'center' }}>{'[ FILM — IMAGE NETTE ]\naffiche du jour'}</div>
        {/* input (focused, keyboard shown) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 14px', background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)', border: '1.5px solid var(--acc)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <span style={{ flex: 1, fontSize: 15 }}>Inter<span style={{ color: 'var(--acc)', fontWeight: 600 }}>|</span></span>
        </div>
        {/* autocomplete */}
        <div style={{ marginTop: 8, background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', overflow: 'hidden' }}>
          {[{ t: 'Interstellar', m: '2014 · Sci-Fi' }, { t: 'Inception', m: '2010 · Thriller' }].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: i === 0 ? 'var(--gt-surface-3)' : 'transparent', borderBottom: i === 0 ? '1px solid var(--gt-line)' : 'none' }}>
              <div className="gt-ph" style={{ width: 26, height: 36, borderRadius: 4, fontSize: 7 }}>img</div>
              <div><div style={{ fontSize: 14, fontWeight: 500 }}>{s.t}</div><div style={{ fontSize: 11.5, color: 'var(--gt-text-3)' }}>{s.m}</div></div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--gt-text-3)', margin: '12px 2px 0' }}>5 essais · 3 indices · glisse pour passer un essai</p>
      </div>
    </IOSDevice>
  );
}

/* ---- FilmGuess — playing (2 tries, 2 hints) ---- */
function IOSFilmPlaying() {
  return (
    <IOSDevice dark>
      <div className="gt-root gt-film" style={{ background: 'var(--gt-bg)', minHeight: '100%', padding: '56px 18px 30px', color: 'var(--gt-text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20, color: 'var(--gt-text-3)' }}>‹</span>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}><GameGlyph game="film" size={18} /></span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16 }}>FilmGuess</div><div className="gt-mono" style={{ fontSize: 11, color: 'var(--gt-text-3)' }}>#142</div></div>
          <IOSTriesDots used={2} />
        </div>
        <div className="gt-ph" style={{ height: 150, borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', fontSize: 11, marginBottom: 14, whiteSpace: 'pre-line', textAlign: 'center' }}>{'[ FILM — IMAGE NETTE ]'}</div>
        {/* hints */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <IOSHint index={1} label="Année" value="2014" revealed />
          <IOSHint index={2} label="Acteur" value="M. McConaughey" revealed />
          <IOSHint index={3} revealed={false} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Tes tentatives</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <IOSAttemptRow state="wrong" text="Inception" />
          <IOSAttemptRow state="skip" text="Essai passé" />
          <IOSAttemptRow state="empty" />
          <IOSAttemptRow state="empty" />
          <IOSAttemptRow state="empty" />
        </div>
      </div>
    </IOSDevice>
  );
}

/* ---- FaceGuess — blurred + bio ---- */
function IOSFace() {
  return (
    <IOSDevice dark>
      <div className="gt-root gt-face" style={{ background: 'var(--gt-bg)', minHeight: '100%', padding: '56px 18px 30px', color: 'var(--gt-text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20, color: 'var(--gt-text-3)' }}>‹</span>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}><GameGlyph game="face" size={18} /></span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16 }}>FaceGuess</div><div className="gt-mono" style={{ fontSize: 11, color: 'var(--gt-text-3)' }}>#142</div></div>
          <IOSTriesDots used={2} />
        </div>
        {/* blurred image — stays blurred */}
        <div style={{ height: 168, borderRadius: 'var(--gt-r-md)', border: '1px solid var(--gt-line-2)', position: 'relative', overflow: 'hidden', marginBottom: 12 }}>
          <div className="gt-ph" style={{ position: 'absolute', inset: 0, filter: 'blur(26px)', transform: 'scale(1.2)' }}></div>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, transparent, var(--gt-bg-2) 130%)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div><div style={{ fontSize: 30, opacity: .4 }}>👤</div><div className="gt-mono" style={{ fontSize: 10.5, color: 'var(--gt-text-3)', marginTop: 4 }}>photo floue · reste floue</div></div>
          </div>
        </div>
        {/* bio */}
        <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-md)', padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gt-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Bio (vague)</div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gt-text-2)', lineHeight: 1.5, fontStyle: 'italic' }}>« Actrice et productrice née dans les années 1960, connue pour des rôles dramatiques récompensés. »</p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <IOSHint index={1} label="Domaine" value="Cinéma" revealed />
          <IOSHint index={2} label="Nationalité" value="Australienne" revealed />
          <IOSHint index={3} revealed={false} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 14px', background: 'var(--gt-surface-2)', borderRadius: 'var(--gt-r-md)', border: '1.5px solid var(--acc)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <span style={{ flex: 1, fontSize: 15, color: 'var(--gt-text-4)' }}>Nom de la personnalité…</span>
        </div>
      </div>
    </IOSDevice>
  );
}

Object.assign(window, { IOSTriesDots, IOSAttemptRow, IOSHint, IOSFilmStart, IOSFilmPlaying, IOSFace });
