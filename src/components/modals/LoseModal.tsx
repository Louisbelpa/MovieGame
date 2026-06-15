import { Link } from 'react-router-dom'
import { Share2, BarChart2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { NextGameCountdown } from '@/components/modals/NextGameCountdown'

type GameMode = 'film' | 'series' | 'wiki'

function GlyphC({ game, size = 18 }: { game: string; size?: number }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (game === 'film')  return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" {...s} /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} /></svg>
  if (game === 'serie') return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" {...s} /><path d="M8 3l4 4 4-4" {...s} /></svg>
  if (game === 'face')  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...s} /><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} /></svg>
  return null
}

function modeGlyph(m: GameMode) {
  if (m === 'series') return 'serie'
  if (m === 'wiki')   return 'face'
  return 'film'
}

interface LoseModalProps {
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

export function LoseModal({ isOpen, onClose, mode, result, onShare, onShareAll, onOpenStats, unplayedModes }: LoseModalProps) {
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()
  const accentCls = mode === 'wiki' ? 'g-face' : mode === 'series' ? 'g-serie' : 'g-film'

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={accentCls}>
      <div className="cdy-end">

        {/* 1. Tag statut */}
        <div className="e-tag">PERDU POUR AUJOURD'HUI</div>

        {/* 2. Emoji défaite */}
        <div className="e-emoji">🫥</div>

        {/* 3. Réponse */}
        <div className="e-answer">
          <span className="e-poster">
            {result.photoUrl && (
              <img
                src={result.photoUrl}
                alt={result.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="e-alabel">La réponse était</div>
            <div className="e-atitle">{result.name}</div>
            {result.year && (
              <div className="cdy-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{result.year}</div>
            )}
          </div>
        </div>

        {/* 4. Série remise à zéro */}
        <div className="e-streak">Série remise à zéro · <b>🔥 0 jour</b></div>

        {/* 5. Message consolation */}
        <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-2)', fontWeight: 500 }}>
          Pas de panique — un nouveau défi t'attend demain.
        </p>

        {/* 6. Mur d'inscription (non connecté) */}
        {!user && (
          <div style={{ width: '100%', borderRadius: 16, padding: '14px', background: 'var(--bg-2)', border: '2.5px solid var(--line)', boxShadow: '0 4px 0 var(--line-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Protège ta progression</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', fontWeight: 400 }}>
              Un compte gratuit sauvegarde tes stats et ta série.
            </p>
            <button
              type="button"
              onClick={() => { onClose(); openAuth('register') }}
              className="cdy-btn cdy-btn-soft"
              style={{ width: '100%' }}
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* 7. Partager quand même */}
        <button type="button" onClick={onShare} className="cdy-btn cdy-btn-primary" style={{ width: '100%', padding: '15px' }}>
          <Share2 size={16} />
          Partager quand même
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

        {/* 9. Défis non joués */}
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

        {/* 10. Partager les 3 */}
        {onShareAll && (
          <button type="button" onClick={onShareAll} className="cdy-btn cdy-btn-soft" style={{ width: '100%', fontSize: 13.5 }}>
            <Share2 size={14} />
            Partager les 3 jeux
          </button>
        )}

        {/* 11. Countdown */}
        <div className="cdy-mono" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>
          Prochain défi dans <NextGameCountdown />
        </div>
      </div>
    </Modal>
  )
}
