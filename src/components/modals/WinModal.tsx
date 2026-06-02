import { Share2, BarChart2, Flame } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { loadStats } from '@/lib/storage'
import { NextGameCountdown } from '@/components/modals/NextGameCountdown'

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={accentCls}>
      <div className="cdym-result" style={{ position: 'relative' }}>
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

        {/* 6. Partager */}
        <button type="button" onClick={onShare} className="cdy-btn cdy-btn-primary" style={{ width: '100%', padding: '15px' }}>
          <Share2 size={16} />
          Partager ma journée
        </button>

        {/* 7. Stats + Accueil */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {onOpenStats && (
            <button type="button" onClick={onOpenStats} className="cdy-btn cdy-btn-soft" style={{ flex: 1 }}>
              <BarChart2 size={15} />
              Stats du jour
            </button>
          )}
          <a href="/" className="cdy-btn cdy-btn-soft" style={{ flex: 1, textDecoration: 'none' }}>
            Accueil
          </a>
        </div>

        {/* 8. Défis non joués (teaser) */}
        {unplayedModes && unplayedModes.length > 0 && (
          <div style={{ width: '100%' }}>
            <div className="cdy-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, textAlign: 'center' }}>
              ✨ +{unplayedModes.length} défis t'attendent aujourd'hui
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {unplayedModes.map(({ type, path }) => (
                <a key={type} href={path} className="cdy-btn cdy-btn-soft" style={{ flex: 1, textDecoration: 'none', padding: '10px 12px' }}>
                  <GlyphC game={modeGlyph(type)} size={16} />
                  {type === 'wiki' ? 'FaceGuess' : type === 'series' ? 'SerieGuess' : 'FilmGuess'}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 9. Partager les 3 */}
        {onShareAll && (
          <button type="button" onClick={onShareAll} className="cdy-btn cdy-btn-soft" style={{ width: '100%', fontSize: 13.5 }}>
            <Share2 size={14} />
            Partager les 3 jeux
          </button>
        )}

        {/* 10. Prochain défi */}
        <div className="cdy-mono" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>
          Prochain défi dans <NextGameCountdown />
        </div>
      </div>
    </Modal>
  )
}
