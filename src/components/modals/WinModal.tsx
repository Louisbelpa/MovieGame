import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Share2, Trophy, BarChart2, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface WinModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'film' | 'series' | 'wiki'
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
  onPlayOtherMode?: () => void
}

export function WinModal({ isOpen, onClose, mode, result, stats, onShare, onOpenStats, onPlayOtherMode }: WinModalProps) {
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
      ariaLabelledBy={modalTitleId}
      ariaDescribedBy={modalDescId}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <p id={modalDescId} className="sr-only">
          Résumé de victoire et actions de partage.
        </p>

        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
          className="w-16 h-16 rounded-full bg-film-gold/15 border border-film-gold/30 flex items-center justify-center"
        >
          <Trophy size={32} className="text-film-gold" />
        </motion.div>

        <div>
          <p className="text-film-text-dim text-sm mb-1">Bravo ! Vous avez trouvé en</p>
          <p id={modalTitleId} className="text-4xl font-title font-bold text-gradient-gold">
            {stats.attemptsUsed}<span className="text-2xl">/{stats.maxAttempts}</span>
          </p>
        </div>

        <div className="w-full film-border rounded-xl overflow-hidden bg-film-black/40">
          {result.photoUrl &&
            (isWiki ? (
              <div className="flex h-60 sm:h-72 md:h-80 w-full items-center justify-center bg-film-black/70">
                <img
                  src={result.photoUrl}
                  alt={result.name}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <img src={result.photoUrl} alt={result.name} className="w-full aspect-video object-cover" />
            ))}
          <div className="p-3 text-left">
            <p className="font-title text-lg font-semibold text-film-text leading-tight">{result.name}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {!isWiki && result.year && <Badge variant="muted">{result.year}</Badge>}
              {!isWiki && result.director && <Badge variant="muted">{result.director}</Badge>}
              {!isWiki && result.genres?.slice(0, 2).map((g) => (
                <Badge key={g} variant="gold">{g}</Badge>
              ))}
              {isWiki && result.personType && <Badge variant="gold">{result.personType}</Badge>}
            </div>
            {result.extract && (
              <p className="text-sm text-film-text-dim mt-2 line-clamp-4 text-left">
                {result.extract}
              </p>
            )}
          </div>
        </div>

        <div className="text-sm text-film-text-dim">
          <p>Trouvé en {stats.attemptsUsed}/{stats.maxAttempts} essais</p>
          <p>Indices utilisés: {stats.hintsRevealed}</p>
          <p>Prochain défi dans <NextGameCountdown /></p>
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
        {onPlayOtherMode && (
          <Button onClick={onPlayOtherMode} variant="secondary" size="md" className="w-full">
            Essayer un autre mode
          </Button>
        )}

        {learnMoreUrl && (
          <a
            href={learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-film-text-dim hover:text-film-text transition-colors"
          >
            <ExternalLink size={12} />
            {isWiki ? 'En savoir plus sur Wikipedia' : 'En savoir plus sur TMDB'}
          </a>
        )}
      </div>
    </Modal>
  )
}

function getSecondsUntilMidnightParis(): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
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
