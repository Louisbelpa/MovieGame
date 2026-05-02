/**
 * modals/WinModal.tsx
 * Shown when the player guesses correctly.
 */

import { motion } from 'framer-motion'
import { Share2, Trophy, BarChart2, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { getTodayParis, useGameStore } from '@/store/gameStore'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'

export function WinModal() {
  const isOpen = useGameStore((s) => s.ui.isModalOpen && s.ui.modalType === 'win')
  const closeModal = useGameStore((s) => s.closeModal)
  const openModal = useGameStore((s) => s.openModal)
  const shareResult = useGameStore((s) => s.shareResult)
  const result = useGameStore((s) => s.result)
  const guesses = useGameStore((s) => s.guesses)
  const gameType = useGameStore((s) => s.gameType)
  const viewingDate = useGameStore((s) => s.viewingDate)

  if (!result) return null

  const correctAttempt = guesses.findIndex((g) => g.status === 'correct') + 1
  const maxAttempts = result.maxAttempts
  const tmdbUrl = result.tmdbId
    ? `https://www.themoviedb.org/${result.mediaType === 'series' ? 'tv' : 'movie'}/${result.tmdbId}`
    : null
  const otherType = gameType === 'film' ? 'series' : 'film'
  const otherPlayedToday = loadStats(otherType).lastPlayedDate === getTodayParis()
  const showOtherModeCta = FEATURES.enableSeries && !viewingDate && !otherPlayedToday

  function goToOtherMode() {
    closeModal()
    window.location.href = otherType === 'series' ? '/series' : '/films'
  }

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Trophy animation */}
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
          <p className="text-4xl font-title font-bold text-gradient-gold">
            {correctAttempt}<span className="text-2xl">/{maxAttempts}</span>
          </p>
        </div>

        {/* Movie reveal */}
        <div className="w-full film-border rounded-xl overflow-hidden">
          <img
            src={result.imageUrl}
            alt={result.title}
            className="w-full aspect-video object-cover"
          />
          <div className="p-3 text-left">
            <p className="font-title text-lg font-semibold text-film-text leading-tight">
              {result.title}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge variant="muted">{result.year}</Badge>
              <Badge variant="muted">{result.director}</Badge>
              {result.genres.slice(0, 2).map((g) => (
                <Badge key={g} variant="gold">{g}</Badge>
              ))}
            </div>
            {result.tagline && (
              <p className="text-sm text-film-text-dim italic mt-2">"{result.tagline}"</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full">
          <Button
            variant="secondary"
            size="md"
            onClick={() => { closeModal(); openModal('stats') }}
            className="flex-1"
          >
            <BarChart2 size={15} />
            Stats
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={shareResult}
            className="flex-1"
          >
            <Share2 size={15} />
            Partager
          </Button>
        </div>

        {showOtherModeCta && (
          <Button
            variant="primary"
            size="md"
            onClick={goToOtherMode}
            className="w-full !text-white hover:brightness-110 transition-[filter]"
            style={{ backgroundColor: otherType === 'series' ? 'var(--sg-series)' : 'var(--sg-films)' }}
          >
            {otherType === 'series' ? 'Jouer la série du jour' : 'Jouer le film du jour'}
          </Button>
        )}

        {/* Learn more */}
        {tmdbUrl && (
          <a
            href={tmdbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-film-text-dim hover:text-film-text transition-colors"
          >
            <ExternalLink size={12} />
            En savoir plus sur TMDB
          </a>
        )}

        <p className="text-sm text-film-text-dim">
          Prochain film dans <NextGameCountdown />
        </p>
      </div>
    </Modal>
  )
}

/** Counts down to midnight in Europe/Paris timezone */
function NextGameCountdown() {
  const now = new Date()

  // Get current hour/minute/second in Paris
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)

  const h = get('hour')
  const m = get('minute')
  const s = get('second')
  const secondsUntilMidnight = (24 * 3600) - (h * 3600 + m * 60 + s)
  const hoursLeft = Math.floor(secondsUntilMidnight / 3600)
  const minsLeft = Math.floor((secondsUntilMidnight % 3600) / 60)

  return <strong className="text-film-text">{hoursLeft}h{minsLeft}</strong>
}
