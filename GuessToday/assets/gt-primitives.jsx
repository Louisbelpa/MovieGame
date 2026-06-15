/* GuessToday — shared UI primitives. Exports to window. */
const { useState } = React;

/* ---------- Logo / wordmark ---------- */
// The mark: a rounded square "die" with a question glyph; wordmark "Guess" + "Today".
function GTLogo({ size = 28, mark = true, mono = false }) {
  const fs = size;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32 }}>
      {mark && (
        <span style={{
          width: size * 1.18, height: size * 1.18, borderRadius: size * 0.32,
          background: 'var(--gt-brand)', color: 'var(--gt-bg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--gt-sans)', fontWeight: 700, fontSize: size * 0.82,
          flex: '0 0 auto', boxShadow: '0 0 0 1px rgba(255,255,255,.04)',
        }}>?</span>
      )}
      <span style={{ fontFamily: 'var(--gt-sans)', fontWeight: 700, fontSize: fs, letterSpacing: '-0.02em', lineHeight: 1 }}>
        <span style={{ color: mono ? 'currentColor' : 'var(--gt-text)' }}>Guess</span>
        <span style={{ color: mono ? 'currentColor' : 'var(--gt-brand)' }}>Today</span>
      </span>
    </span>
  );
}

/* ---------- Game glyphs (minimalist, geometric) ---------- */
function GameGlyph({ game, size = 24, color = 'currentColor' }) {
  const s = size;
  const stroke = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (game === 'film') return (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" {...stroke}/><path d="M3 9h18M7 4v16M17 4v16" {...stroke}/></svg>
  );
  if (game === 'serie') return (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2" {...stroke}/><path d="M8 3l4 3 4-3" {...stroke}/></svg>
  );
  if (game === 'face') return (
    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...stroke}/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" {...stroke}/></svg>
  );
  if (game === 'game-4') return (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" {...stroke}/><circle cx="6" cy="18" r="1.4" fill={color} stroke="none"/></svg>
  );
  return null;
}

const GAME_META = {
  film:    { key: 'film',  name: 'FilmGuess',  cls: 'gt-film',   label: 'Films',          glyph: 'film' },
  serie:   { key: 'serie', name: 'SerieGuess', cls: 'gt-serie',  label: 'Séries',         glyph: 'serie' },
  face:    { key: 'face',  name: 'FaceGuess',  cls: 'gt-face',   label: 'Personnalités',  glyph: 'face' },
  'game-4':{ key: 'game-4',name: 'SongGuess',  cls: 'gt-game-4', label: 'Musique',        glyph: 'game-4' },
};

/* ---------- Button ---------- */
function GTButton({ children, variant = 'primary', size = 'md', full, accent, style, icon }) {
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 13, radius: 'var(--gt-r-sm)' },
    md: { padding: '12px 20px', fontSize: 15, radius: 'var(--gt-r-md)' },
    lg: { padding: '16px 28px', fontSize: 17, radius: 'var(--gt-r-md)' },
  }[size];
  const acc = accent || 'var(--gt-brand)';
  const variants = {
    primary: { background: acc, color: 'var(--gt-bg)', border: '1px solid transparent', fontWeight: 600 },
    accent:  { background: 'var(--acc, var(--gt-brand))', color: 'var(--gt-bg)', border: '1px solid transparent', fontWeight: 600 },
    ghost:   { background: 'transparent', color: 'var(--gt-text)', border: '1px solid var(--gt-line-2)', fontWeight: 500 },
    soft:    { background: 'var(--gt-surface-2)', color: 'var(--gt-text)', border: '1px solid var(--gt-line)', fontWeight: 500 },
    danger:  { background: 'var(--gt-wrong-dim)', color: 'var(--gt-wrong)', border: '1px solid transparent', fontWeight: 600 },
  }[variant];
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: 'var(--gt-sans)', cursor: 'pointer', whiteSpace: 'nowrap',
      borderRadius: sizes.radius, padding: sizes.padding, fontSize: sizes.fontSize,
      width: full ? '100%' : 'auto', transition: 'transform .1s', ...variants, ...style,
    }}>{icon}{children}</button>
  );
}

/* ---------- Badge / chip ---------- */
function GTBadge({ children, tone = 'neutral', style, icon }) {
  const tones = {
    neutral: { background: 'var(--gt-surface-2)', color: 'var(--gt-text-2)' },
    accent:  { background: 'var(--acc-dim, var(--gt-surface-2))', color: 'var(--acc, var(--gt-text))' },
    success: { background: 'var(--gt-correct-dim)', color: 'var(--gt-correct)' },
    warn:    { background: 'color-mix(in oklab, var(--gt-warn) 16%, transparent)', color: 'var(--gt-warn)' },
    danger:  { background: 'var(--gt-wrong-dim)', color: 'var(--gt-wrong)' },
    live:    { background: 'var(--gt-surface-3)', color: 'var(--gt-text)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: 'var(--gt-r-pill)', fontSize: 12, fontWeight: 600, letterSpacing: '.01em',
      fontFamily: 'var(--gt-sans)', whiteSpace: 'nowrap', ...tones, ...style,
    }}>{icon}{children}</span>
  );
}

/* ---------- Streak flame pill ---------- */
function GTStreak({ days = 0, size = 'md' }) {
  const big = size === 'lg';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: big ? '8px 14px' : '6px 11px', borderRadius: 'var(--gt-r-pill)',
      background: 'color-mix(in oklab, var(--gt-warn) 14%, var(--gt-surface))',
      border: '1px solid color-mix(in oklab, var(--gt-warn) 30%, transparent)',
    }}>
      <span style={{ fontSize: big ? 18 : 15 }}>🔥</span>
      <span className="gt-mono" style={{ fontWeight: 700, fontSize: big ? 18 : 14, color: 'var(--gt-warn)' }}>{days}</span>
      {big && <span style={{ fontSize: 13, color: 'var(--gt-text-2)', fontWeight: 500 }}>jours</span>}
    </span>
  );
}

/* ---------- Avatar ---------- */
function GTAvatar({ name = 'U', size = 36, hue = 270, ring }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span style={{
      width: size, height: size, flex: '0 0 auto', borderRadius: '50%',
      background: `oklch(0.45 0.12 ${hue})`, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--gt-sans)', fontWeight: 600, fontSize: size * 0.4,
      boxShadow: ring ? `0 0 0 2px var(--gt-bg), 0 0 0 4px ${ring}` : 'none',
    }}>{initials}</span>
  );
}

Object.assign(window, { GTLogo, GameGlyph, GAME_META, GTButton, GTBadge, GTStreak, GTAvatar });
