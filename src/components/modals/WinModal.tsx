import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Share2, BarChart2, Flame, Copy, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { loadStats, loadGameState } from '@/lib/storage'
import { NextGameCountdown } from '@/components/modals/NextGameCountdown'
import { getTodayParis } from '@/store/gameStore'

/** "2026-06-14" → "14 juin 2026" (format français). */
function formatDateFr(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// ── Carte de partage "Ma journée" ────────────────────────────────────────────

type ShareGameMode = 'film' | 'series' | 'wiki'
const GAME_C: Record<ShareGameMode, { cls: string; name: string; glyph: ShareGameMode }> = {
  film:  { cls: 'g-film',  name: 'FilmGuess',  glyph: 'film'  },
  series: { cls: 'g-serie', name: 'SerieGuess', glyph: 'series' },
  wiki:  { cls: 'g-face',  name: 'FaceGuess',  glyph: 'wiki'  },
}

function GlyphShare({ game, size = 17 }: { game: string; size?: number }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (game === 'film' || game === 'film')   return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" {...s} /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} /></svg>
  if (game === 'series') return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" {...s} /><path d="M8 3l4 4 4-4" {...s} /></svg>
  if (game === 'wiki')   return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...s} /><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} /></svg>
  return null
}

function ShareSquares({ won, attempts, total = 5 }: { won: boolean | null; attempts: number; total?: number }) {
  const squares = Array.from({ length: total }, (_, i) => {
    if (won == null) return 'unplayed'
    if (won) return i < attempts - 1 ? 'wrong' : i === attempts - 1 ? 'win' : 'unused'
    return i < attempts ? 'wrong' : 'unused'
  })
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {squares.map((k, i) => (
        <span key={i} style={{
          width: 20, height: 20, borderRadius: 5, display: 'inline-block',
          background: k === 'win' ? 'var(--acc)' : k === 'wrong' ? '#d9ccbe' : 'transparent',
          border: k === 'unused' ? '2px solid var(--line-2)' : k === 'unplayed' ? '2px dashed var(--line-2)' : 'none',
          opacity: k === 'unplayed' ? 0.6 : 1,
        }} />
      ))}
    </div>
  )
}

function SingleGameShareCard({ mode, won, attempts, maxAttempts }: {
  mode: ShareGameMode; won: boolean; attempts: number; maxAttempts: number
}) {
  const today = getTodayParis()
  const g = GAME_C[mode]
  return (
    <div className="cdy-share" style={{ width: '100%' }}>
      <div className="cdy-share-ribbon">
        <div className={g.cls} style={{ flex: 1, background: 'var(--acc)', height: '100%' }} />
      </div>
      <div className="cdy-share-body">
        <div className="cdy-share-head">
          <span className="cdy-share-logo"><span className="d">?</span>GuessToday</span>
          <span className="cdy-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{formatDateFr(today)}</span>
        </div>
        <div className={g.cls}>
          <div className="cdy-share-title">{g.name}</div>
          <div className="cdy-share-sub">{won ? `Trouvé en ${attempts}/${maxAttempts}` : 'Pas trouvé aujourd\'hui'}</div>
        </div>
        <div className={`cdy-share-grow ${g.cls}`} style={{ justifyContent: 'center', padding: '6px 0' }}>
          <ShareSquares won={won} attempts={attempts} total={maxAttempts} />
          <span className="cdy-share-score" style={{ fontSize: 22, color: won ? 'var(--acc)' : 'var(--wrong-d)' }}>
            {won ? `${attempts}/${maxAttempts}` : 'X/5'}
          </span>
        </div>
        <div className="cdy-share-foot">
          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>🙈 Sans spoiler</span>
          <span>guesstoday.fr</span>
        </div>
      </div>
    </div>
  )
}

function DailyShareCard({ currentMode, currentWon, currentAttempts }: {
  currentMode: ShareGameMode; currentWon: boolean; currentAttempts: number
}) {
  const today = getTodayParis()
  const streak = loadStats(currentMode).currentStreak
  const list: Array<{ mode: ShareGameMode; won: boolean | null; attempts: number }> = (
    ['film', 'series', 'wiki'] as ShareGameMode[]
  ).map((m) => {
    if (m === currentMode) return { mode: m, won: currentWon, attempts: currentAttempts }
    const s = loadGameState(m)
    if (!s) return { mode: m, won: null, attempts: 0 }
    return { mode: m, won: s.status === 'won', attempts: s.guesses.length }
  })
  const solved = list.filter((r) => r.won === true).length

  return (
    <div className="cdy-share" style={{ width: '100%' }}>
      <div className="cdy-share-ribbon">
        {list.map((r) => <div key={r.mode} className={GAME_C[r.mode].cls} style={{ flex: 1, background: 'var(--acc)', height: '100%' }} />)}
      </div>
      <div className="cdy-share-body">
        <div className="cdy-share-head">
          <span className="cdy-share-logo"><span className="d">?</span>GuessToday</span>
          <span className="cdy-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{formatDateFr(today)}</span>
        </div>
        <div>
          <div className="cdy-share-title">Ma journée 🎯</div>
          <div className="cdy-share-sub">{solved}/3 défis · {streak > 0 ? `🔥 ${streak} jour${streak > 1 ? 's' : ''}` : 'nouvelle série'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {list.map((r) => (
            <div key={r.mode} className={`cdy-share-grow ${GAME_C[r.mode].cls}`}>
              <span className="sg"><GlyphShare game={r.mode} size={17} /></span>
              <ShareSquares won={r.won} attempts={r.attempts} />
              <span className="cdy-share-score" style={{ color: r.won === true ? 'var(--acc)' : r.won === false ? 'var(--wrong-d)' : 'var(--ink-3)' }}>
                {r.won === true ? `${r.attempts}/5` : r.won === false ? 'X/5' : '–'}
              </span>
            </div>
          ))}
        </div>
        <div className="cdy-share-foot">
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {list.map((r) => <span key={r.mode} className={GAME_C[r.mode].cls} style={{ width: 8, height: 8, borderRadius: '50%', background: r.won === true ? 'var(--acc)' : r.won === false ? 'var(--wrong)' : 'var(--line-2)', display: 'inline-block' }} />)}
            <span style={{ marginLeft: 4 }}>{solved}/3 joués</span>
          </span>
          <span>guesstoday.fr</span>
        </div>
      </div>
    </div>
  )
}

// Confetti — 20 particules CSS
const CONFETTI_COLORS = ['#ff7a4d','#ffce4a','#27c08a','#ff6b81','#9b6cff','#3bb6f5','#ff9436']
function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i} style={{
          position: 'absolute', top: 0,
          left: `${5 + (i * 4.75) % 90}%`,
          width: `${5 + (i % 4) * 2}px`, height: `${5 + (i % 4) * 2}px`,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          borderRadius: i % 2 === 0 ? '50%' : '2px',
          animation: `confetti-fall ${0.9 + (i % 5) * 0.18}s ${(i * 0.11).toFixed(2)}s ease-in forwards`,
        }} />
      ))}
    </div>
  )
}

function GlyphC({ game, size = 18 }: { game: string; size?: number }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (game === 'film')  return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" {...s} /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} /></svg>
  if (game === 'serie') return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" {...s} /><path d="M8 3l4 4 4-4" {...s} /></svg>
  if (game === 'face')  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...s} /><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} /></svg>
  return null
}

type GameMode = 'film' | 'series' | 'wiki'

function modeGlyph(m: GameMode) {
  if (m === 'series') return 'serie'
  if (m === 'wiki')   return 'face'
  return 'film'
}

interface WinModalProps {
  isOpen: boolean
  onClose: () => void
  mode: GameMode
  result: {
    name: string
    year?: number
    photoUrl?: string | null
    extract?: string | null
    genres?: string[]
    director?: string
    personType?: string
    profile?: unknown
    wikipediaUrl?: string | null
    tmdbId?: number | null
  }
  stats: {
    attemptsUsed: number
    maxAttempts: number
    hintsRevealed: number
  }
  onShare: () => void
  onShareAll?: () => void
  onOpenStats?: () => void
  unplayedModes?: Array<{ type: GameMode; path: string }>
}

export function WinModal({ isOpen, onClose, mode, result, stats, onShare, onShareAll, onOpenStats, unplayedModes }: WinModalProps) {
  const user      = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()
  const statsKey  = mode === 'wiki' ? 'wiki' : mode === 'series' ? 'series' : 'film'
  const streak    = isOpen ? loadStats(statsKey).currentStreak : 0
  const accentCls = mode === 'wiki' ? 'g-face' : mode === 'series' ? 'g-serie' : 'g-film'
  const [shareTab, setShareTab] = useState<'one' | 'day'>('day')
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    onShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={`${accentCls} lg:max-w-4xl`}>
      {/* Desktop: 2-col layout (result + aside partage) */}
      <div className="hidden lg:grid" style={{ gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>

        {/* ── Left col: résultat ── */}
        <div>
          <span className="cdy-badge" style={{ background: 'var(--correct-soft)', color: 'var(--correct-d)', marginBottom: 14 }}>
            ✓ Résolu en {stats.attemptsUsed}/{stats.maxAttempts}
          </span>
          <h2 className="cdy-h1b" style={{ marginBottom: 4 }}>Bien joué ! 🎉</h2>
          <p className="cdy-lead">{mode === 'wiki' ? 'FaceGuess' : mode === 'series' ? 'SerieGuess' : 'FilmGuess'} · Tu as trouvé <strong style={{ color: 'var(--ink)' }}>{result.name}</strong> en {stats.attemptsUsed} essai{stats.attemptsUsed > 1 ? 's' : ''}.</p>

          <div className="cdy-card" style={{ display: 'flex', gap: 20, padding: 22, marginTop: 22 }}>
            <span style={{ width: 100, height: 140, borderRadius: 14, flex: '0 0 auto', overflow: 'hidden', background: 'var(--acc-soft)', backgroundImage: 'repeating-linear-gradient(45deg,rgba(0,0,0,.06) 0 2px,transparent 2px 11px)', display: 'grid', placeItems: 'center' }}>
              {result.photoUrl && <img src={result.photoUrl} alt={result.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 22 }}>{result.name}</div>
              {result.year && <div className="cdy-mono" style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>{result.year}</div>}
              {result.director && <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--ink-2)', fontWeight: 400 }}>Réal. {result.director}</p>}
              <div style={{ display: 'flex', gap: 22, marginTop: 16 }}>
                <div className="cdy-mstat"><b style={{ color: 'var(--acc)' }}>{stats.attemptsUsed}/{stats.maxAttempts}</b><span>ton score</span></div>
                <div className="cdy-mstat"><b>{stats.hintsRevealed}</b><span>indice{stats.hintsRevealed !== 1 ? 's' : ''}</span></div>
                {streak > 0 && <div className="cdy-mstat"><b style={{ color: 'var(--flame)' }}>🔥{streak}</b><span>série</span></div>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            {onOpenStats && (
              <button type="button" onClick={onOpenStats} className="cdy-btn cdy-btn-soft">Stats du jour →</button>
            )}
            <Link to="/" className="cdy-btn cdy-btn-soft" style={{ textDecoration: 'none' }}>Retour à l'accueil</Link>
          </div>
        </div>

        {/* ── Right col: aside partage ── */}
        <aside>
          <div className="cdy-card" style={{ padding: 22 }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 18 }}>Partage ton score</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Aucune réponse révélée — sans spoiler.</p>
            <div className="cdy-seg" style={{ display: 'flex', marginBottom: 16, width: '100%' }}>
              <span style={{ flex: 1, textAlign: 'center' }} className={shareTab === 'one' ? 'on' : ''} onClick={() => setShareTab('one')}>Ce jeu</span>
              <span style={{ flex: 1, textAlign: 'center' }} className={shareTab === 'day' ? 'on' : ''} onClick={() => setShareTab('day')}>Ma journée</span>
            </div>
            {shareTab === 'one' ? (
              <SingleGameShareCard
                mode={statsKey as ShareGameMode}
                won={true}
                attempts={stats.attemptsUsed}
                maxAttempts={stats.maxAttempts}
              />
            ) : (
              <DailyShareCard
                currentMode={statsKey as ShareGameMode}
                currentWon={true}
                currentAttempts={stats.attemptsUsed}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <button type="button" onClick={handleCopy} className="cdy-btn cdy-btn-primary" style={{ width: '100%' }}>
                {copied ? <><Check size={15} /> Copié !</> : <><Copy size={15} /> Copier la carte</>}
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onShare} className="cdy-btn cdy-btn-soft" style={{ flex: 1 }}><Share2 size={14} /> Partager</button>
                {onShareAll && <button type="button" onClick={onShareAll} className="cdy-btn cdy-btn-soft" style={{ flex: 1 }}>Ma journée</button>}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile: résultat simplifié */}
      <div className="lg:hidden cdym-result" style={{ position: 'relative' }}>
        {stats.attemptsUsed <= 3 && <Confetti />}

        {/* 1. Tag statut */}
        <span className="cdym-res-tag">
          ✓ RÉSOLU EN {stats.attemptsUsed}/{stats.maxAttempts}
        </span>

        {/* 2. Score */}
        <div className="cdym-res-score" style={{ color: 'var(--acc,var(--coral))' }}>
          {stats.attemptsUsed}<span>/ {stats.maxAttempts} essais</span>
        </div>

        {/* 3. Réponse */}
        <div className="cdym-res-answer">
          <span className="cdym-res-poster">
            {result.photoUrl && (
              <img
                src={result.photoUrl}
                alt={result.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="l">La réponse était</div>
            <div className="t">{result.name}</div>
            {result.year && (
              <div className="cdy-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{result.year}</div>
            )}
          </div>
        </div>

        {/* 4. Streak */}
        {streak > 0 && (
          <span className="cdy-streak">
            <Flame size={14} /> {streak} jour{streak > 1 ? 's' : ''} de série !
          </span>
        )}

        {/* 5. Mur d'inscription (non connecté) */}
        {!user && (
          <div style={{ width: '100%', borderRadius: 16, padding: '16px', background: 'var(--acc-soft,var(--coral-soft))', border: '2.5px solid var(--acc,var(--coral))', boxShadow: '0 4px 0 rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 24 }}>🔥</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Ne perds pas ce score</div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 400 }}>
              Crée un compte gratuit pour sauvegarder ta série et tes stats.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, background: '#fff', borderRadius: 999, padding: '5px 12px', color: 'var(--ink-2)' }}>🔥 Série</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, background: '#fff', borderRadius: 999, padding: '5px 12px', color: 'var(--ink-2)' }}>📊 Stats</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, background: '#fff', borderRadius: 999, padding: '5px 12px', color: 'var(--ink-2)' }}>👥 Amis</span>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); openAuth('register') }}
              className="cdy-btn cdy-btn-primary"
              style={{ width: '100%', padding: '14px' }}
            >
              Créer un compte gratuit
            </button>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-3)', padding: '4px 0' }}>
              Continuer sans compte
            </button>
          </div>
        )}

        {/* 6. Carte « Ma journée » (visuel) */}
        <div className="cdy-mono" style={{ fontSize: 11, color: 'var(--ink-2)', alignSelf: 'flex-start', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Ta carte « Ma journée »
        </div>
        <DailyShareCard
          currentMode={statsKey as ShareGameMode}
          currentWon={true}
          currentAttempts={stats.attemptsUsed}
        />

        {/* 7. Partager ma journée */}
        <button type="button" onClick={onShareAll ?? onShare} className="cdy-btn cdy-btn-primary" style={{ width: '100%', padding: '15px' }}>
          <Share2 size={16} />
          Partager ma journée
        </button>

        {/* 8. Stats + Accueil */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {onOpenStats && (
            <button type="button" onClick={onOpenStats} className="cdy-btn cdy-btn-soft" style={{ flex: 1 }}>
              <BarChart2 size={15} />
              Stats du jour
            </button>
          )}
          <Link to="/" className="cdy-btn cdy-btn-soft" style={{ flex: 1, textDecoration: 'none' }}>
            Accueil
          </Link>
        </div>

        {/* 9. Défis non joués (teaser) */}
        {unplayedModes && unplayedModes.length > 0 && (
          <div style={{ width: '100%' }}>
            <div className="cdy-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, textAlign: 'center' }}>
              ✨ +{unplayedModes.length} défis t'attendent aujourd'hui
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {unplayedModes.map(({ type, path }) => (
                <Link key={type} to={path} className="cdy-btn cdy-btn-soft" style={{ flex: 1, textDecoration: 'none', padding: '10px 12px' }}>
                  <GlyphC game={modeGlyph(type)} size={16} />
                  {type === 'wiki' ? 'FaceGuess' : type === 'series' ? 'SerieGuess' : 'FilmGuess'}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 10. Prochain défi */}
        <div className="cdy-mono" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>
          Prochain défi dans <NextGameCountdown />
        </div>
      </div>{/* /lg:hidden */}
    </Modal>
  )
}
