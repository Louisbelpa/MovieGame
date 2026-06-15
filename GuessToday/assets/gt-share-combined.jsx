/* GuessToday — Combined daily share card (all games in one, no spoiler).
   This is the "Ma journée" share: aggregates every game played today. */

function GTDailyShareSquares({ game, won, attempts, total = 5, size = 22 }) {
  const squares = [];
  for (let i = 0; i < total; i++) {
    let kind = 'unused';
    if (won == null) kind = 'unplayed';
    else if (won) kind = i < attempts - 1 ? 'wrong' : i === attempts - 1 ? 'win' : 'unused';
    else kind = i < attempts ? 'wrong' : 'unused';
    squares.push(kind);
  }
  return (
    <div className={`gt-${game}`} style={{ display: 'flex', gap: 5 }}>
      {squares.map((k, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: 5,
          background: k === 'win' ? 'var(--acc)' : k === 'wrong' ? 'var(--gt-surface-3)' : 'transparent',
          border: k === 'unused' ? '2px solid var(--gt-line)' : k === 'unplayed' ? '2px dashed var(--gt-line)' : 'none',
          opacity: k === 'unplayed' ? .5 : 1,
        }} />
      ))}
    </div>
  );
}

// results: [{ game, won (bool|null=not played), attempts }]
function GTDailyShareCard({ results, day = 142, streak = 12, width = 380 }) {
  const list = results || [
    { game: 'film', won: true, attempts: 3 },
    { game: 'serie', won: true, attempts: 4 },
    { game: 'face', won: false, attempts: 5 },
  ];
  const solved = list.filter((r) => r.won).length;
  const played = list.filter((r) => r.won != null).length;

  return (
    <div style={{
      width, borderRadius: 'var(--gt-r-lg)', overflow: 'hidden',
      background: 'linear-gradient(165deg, var(--gt-surface) 0%, var(--gt-bg-2) 100%)',
      border: '1px solid var(--gt-line-2)', position: 'relative',
    }}>
      {/* multi-accent ribbon — one stripe per game, signals "combined" */}
      <div style={{ display: 'flex', height: 6 }}>
        {list.map((r) => (
          <div key={r.game} className={`gt-${r.game}`} style={{ flex: 1, background: 'var(--acc)' }} />
        ))}
      </div>
      <div style={{ padding: '22px 24px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <GTLogo size={18} />
          <span className="gt-mono" style={{ fontSize: 12, color: 'var(--gt-text-3)' }}>#{day} · 28.05</span>
        </div>

        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>Ma journée GuessToday</div>
          <div style={{ fontSize: 13, color: 'var(--gt-text-3)', marginTop: 2 }}>{solved}/{list.length} défis résolus · 🔥 {streak} jours</div>
        </div>

        {/* per-game rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((r) => {
            const m = GAME_META[r.game];
            return (
              <div key={r.game} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`gt-${r.game}`} style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: 8, background: 'var(--acc-dim)', color: 'var(--acc)', display: 'grid', placeItems: 'center' }}>
                  <GameGlyph game={m.glyph} size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <GTDailyShareSquares game={r.game} won={r.won} attempts={r.attempts} size={20} />
                </div>
                <span style={{ minWidth: 38, textAlign: 'right' }}>
                  <span className={`gt-${r.game}`} style={{ fontFamily: 'var(--gt-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 700, color: r.won == null ? 'var(--gt-text-4)' : r.won ? 'var(--acc)' : 'var(--gt-wrong)' }}>
                    {r.won == null ? '–' : r.won ? `${r.attempts}/5` : 'X/5'}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--gt-line)', paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {list.map((r) => (
              <span key={r.game} className={`gt-${r.game}`} style={{ width: 9, height: 9, borderRadius: '50%', background: r.won == null ? 'var(--gt-line-2)' : r.won ? 'var(--acc)' : 'var(--gt-wrong)' }} />
            ))}
            <span style={{ fontSize: 12, color: 'var(--gt-text-3)', marginLeft: 4 }}>{played}/{list.length} joués</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--gt-text-4)' }}>guesstoday.app</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GTDailyShareCard, GTDailyShareSquares });
