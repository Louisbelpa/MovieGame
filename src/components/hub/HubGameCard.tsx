import { Link, useNavigate } from 'react-router-dom'
import { GlyphC } from '@/components/hub/GlyphC'
import type { TodayStatus } from '@/components/hub/types'

interface HubGameCardProps {
  href: string
  game: 'film' | 'serie' | 'face'
  name: string
  label: string
  todayStatus: TodayStatus
  attemptsUsed?: number
  maxAttempts?: number
  disabled?: boolean
}

export function HubGameCard({
  href,
  game,
  name,
  label,
  todayStatus,
  attemptsUsed,
  maxAttempts = 5,
  disabled,
}: HubGameCardProps) {
  const navigate = useNavigate()
  const cls = game === 'film' ? 'g-film' : game === 'serie' ? 'g-serie' : 'g-face'
  const isWon = todayStatus === 'won'
  const isLost = todayStatus === 'lost'
  const done = isWon || isLost

  const chip = done
    ? (isWon ? '✓ Terminé' : '✕ Perdu')
    : disabled
      ? 'Bientôt'
      : `${maxAttempts} essais · 3 indices`

  const dots = done && isWon && attemptsUsed
    ? Array.from({ length: maxAttempts }, (_, i) => (
        <i key={i} className={i < attemptsUsed - 1 ? 'w' : i === attemptsUsed - 1 ? 'g' : ''} />
      ))
    : null

  const body = (
    <>
      <div className="cdy-gc-top">
        <div className="cdy-gc-glyph"><GlyphC game={game} size={26} /></div>
        <div className="cdy-gc-meta">
          <div className="cdy-gc-name">{name}</div>
          <div className="cdy-gc-label">{label}</div>
        </div>
        <span className="cdy-gc-chip">{chip}</span>
      </div>
      <div className={`cdy-gc-body${!done && !disabled ? ' cdy-gc-body--solo' : ''}`}>
        {done ? (
          <>
            <div className={`cdy-gc-status ${isWon ? 'done' : 'todo'}`}>
              <span className="tk">{isWon ? '✓' : '✕'}</span>
              <span className="cdy-gc-status-text">
                {isWon
                  ? `Trouvé en ${attemptsUsed ?? '?'}/${maxAttempts}`
                  : `Perdu · ${maxAttempts}/${maxAttempts}`}
              </span>
              {dots && <span className="cdy-dots">{dots}</span>}
            </div>
            <button
              type="button"
              className="cdy-btn cdy-btn-soft cdy-gc-action"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(href) }}
            >
              Voir le résultat
            </button>
          </>
        ) : disabled ? (
          <>
            <div className="cdy-gc-status todo cdy-gc-status-wide">
              <span className="tk">·</span>
              Bientôt disponible
            </div>
            <button type="button" className="cdy-btn cdy-btn-soft cdy-gc-action" style={{ opacity: 0.5 }} disabled>
              Non disponible
            </button>
          </>
        ) : (
          <>
            <div className="cdy-gc-status todo cdy-gc-status-wide">
              <span className="tk">·</span>
              Pas encore joué aujourd&apos;hui
            </div>
            <span className="cdy-btn cdy-btn-primary cdy-gc-action cdy-gc-play">Jouer maintenant →</span>
          </>
        )}
      </div>
    </>
  )

  const className = `cdy-gamecard ${cls}`

  if (disabled) {
    return <div className={className}>{body}</div>
  }

  return (
    <Link to={href} className={className} style={{ textDecoration: 'none' }}>
      {body}
    </Link>
  )
}
