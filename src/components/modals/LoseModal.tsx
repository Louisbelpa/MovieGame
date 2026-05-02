/**
 * modals/LoseModal.tsx
 * Shown when the player exhausts all attempts.
 */

import { motion } from 'framer-motion'
import { Share2, BarChart2, Film, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { getTodayParis, useGameStore } from '@/store/gameStore'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'

export function LoseModal() {
  const isOpen = useGameStore((s) => s.ui.isModalOpen && s.ui.modalType === 'lose')
  const closeModal = useGameStore((s) => s.closeModal)
  const openModal = useGameStore((s) => s.openModal)
  const shareResult = useGameStore((s) => s.shareResult)
  const result = useGameStore((s) => s.result)
  const gameType = useGameStore((s) => s.gameType)
  const viewingDate = useGameStore((s) => s.viewingDate)

  if (!result) return null

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
    <Modal isOpen={isOpen} onClose={closeModal} ariaLabel="Défi échoué">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="w-16 h-16 rounded-full bg-film-red/10 border border-film-red/30 flex items-center justify-center"
        >
          <Film size={32} className="text-film-red" />
        </motion.div>

        <div>
          <p className="text-film-text text-base font-semibold">Pas de chance !</p>
          <p className="text-film-text-dim text-sm mt-0.5">Le film était…</p>
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
                <Badge key={g} variant="amber">{g}</Badge>
              ))}
            </div>
            {result.synopsis && (
              <p className="text-xs text-film-text-dim mt-2 line-clamp-3 text-left">
                {result.synopsis}
              </p>
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
            className="flex items-center gap-1.5 text-xs text-film-text-dim hover:text-film-text transition-colors"
          >
            <ExternalLink size={12} />
            En savoir plus sur TMDB
          </a>
        )}
      </div>
    </Modal>
  )
}
