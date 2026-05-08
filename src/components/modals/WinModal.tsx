import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Share2, Trophy, BarChart2, ExternalLink, Film, Tv, Landmark } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type GameMode = 'film' | 'series' | 'wiki'

const MODE_META: Record<GameMode, { label: string; icon: React.ElementType }> = {
  film: { label: 'Cinéma', icon: Film },
  series: { label: 'Séries', icon: Tv },
  wiki: { label: 'WikiGuessr', icon: Landmark },
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
    creator?: string
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
  onOpenStats?: () => void
  unplayedModes?: Array<{ type: GameMode; path: string }>
}

export function WinModal({ isOpen, onClose, mode, result, stats, onShare, onOpenStats, unplayedModes }: WinModalProps) {
  const isWiki = mode === 'wiki'
  const modalTitleId = 'modal-title-win'
  const modalDescId = 'modal-desc'
  const tmdbUrl = !isWiki && result.tmdbId
    ? `https://www.themoviedb.org/${mode === 'series' ? 'tv' : 'movie'}/${result.tmdbId}`
    : null
  const learnMoreUrl = isWiki ? (result.wikipediaUrl ?? null) : tmdbUrl

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      headerContent={
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
            className="w-8 h-8 rounded-full bg-film-gold/15 border border-film-gold/30 flex items-center justify-center"
          >
            <Trophy size={16} className="text-film-gold" />
          </motion.div>
          <span id={modalTitleId} className="font-title font-semibold text-film-text">Bravo !</span>
        </div>
      }
      ariaLabelledBy={modalTitleId}
      ariaDescribedBy={modalDescId}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <p id={modalDescId} className="sr-only">Résumé de victoire et actions de partage.</p>

        <div className="w-full film-border rounded-xl overflow-hidden bg-film-black/40">
          {result.photoUrl && (
            isWiki ? (
              <div className="flex h-48 w-full items-center justify-center bg-film-black/70">
                <img src={result.photoUrl} alt={result.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <img src={result.photoUrl} alt={result.name} className="w-full aspect-video object-cover" />
            )
          )}
          <div className="p-3 text-left">
            <div className="flex items-start justify-between gap-2">
              <p className="font-title text-lg font-semibold text-film-text leading-tight">{result.name}</p>
              {learnMoreUrl && (
                <a href={learnMoreUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-film-text-dim hover:text-film-text transition-colors mt-0.5">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {!isWiki && result.year && <Badge variant="muted">{result.year}</Badge>}
              {!isWiki && result.director && <Badge variant="muted">{result.director}</Badge>}
              {!isWiki && result.genres?.slice(0, 2).map((g) => (
                <Badge key={g} variant="gold">{g}</Badge>
              ))}
              {isWiki && result.personType && <Badge variant="gold">{result.personType}</Badge>}
            </div>
            {result.extract && (
              <p className="text-sm text-film-text-dim mt-2 line-clamp-3 text-left">{result.extract}</p>
            )}
            <p className="text-xs text-film-text-dim mt-2">
              {stats.attemptsUsed}/{stats.maxAttempts} essais · {stats.hintsRevealed} indice{stats.hintsRevealed !== 1 ? 's' : ''} utilisé{stats.hintsRevealed !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full">
          {onOpenStats && (
            <Button onClick={onOpenStats} variant="secondary" size="md" className="flex-1">
              <BarChart2 size={15} />
              Stats
            </Button>
          )}
          <Button onClick={onShare} variant="primary" size="md" className="flex-1">
            <Share2 size={15} />
            Partager
          </Button>
        </div>

        {unplayedModes && unplayedModes.length > 0 && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-film-border" />
              <p className="text-xs text-film-text-dim shrink-0">Jouer aussi aujourd'hui</p>
              <div className="flex-1 h-px bg-film-border" />
            </div>
            <div className="flex gap-2">
              {unplayedModes.map(({ type, path }) => {
                const { label, icon: Icon } = MODE_META[type]
                return (
                  <a key={type} href={path} className="flex-1">
                    <Button variant="secondary" size="md" className="w-full">
                      <Icon size={14} />
                      {label}
                    </Button>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-film-text-dim">
          Prochain défi dans <NextGameCountdown />
        </p>
      </div>
    </Modal>
  )
}

function getSecondsUntilMidnightParis(): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
  return 24 * 3600 - (get('hour') * 3600 + get('minute') * 60 + get('second'))
}

function NextGameCountdown() {
  const [secs, setSecs] = useState(getSecondsUntilMidnightParis)

  useEffect(() => {
    const id = setInterval(() => setSecs(getSecondsUntilMidnightParis()), 1000)
    return () => clearInterval(id)
  }, [])

  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return (
    <strong className="text-film-text tabular-nums">
      {h}h{String(m).padStart(2, '0')}m{String(s).padStart(2, '0')}s
    </strong>
  )
}
