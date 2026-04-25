/**
 * modals/WinModal.tsx
 * Shown when the player guesses correctly.
 * Displays movie reveal, attempt count, and share button.
 */

import { motion } from 'framer-motion'
import { Share2, Trophy, BarChart2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useGameStore } from '@/store/gameStore'

export function WinModal() {
  const isOpen = useGameStore((s) => s.ui.isModalOpen && s.ui.modalType === 'win')
  const closeModal = useGameStore((s) => s.closeModal)
  const openModal = useGameStore((s) => s.openModal)
  const shareResult = useGameStore((s) => s.shareResult)
  const result = useGameStore((s) => s.result)
  const guesses = useGameStore((s) => s.guesses)

  if (!result) return null

  const correctAttempt = guesses.findIndex((g) => g.status === 'correct') + 1

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
            {correctAttempt}<span className="text-2xl">/6</span>
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
              <p className="text-xs text-film-text-dim italic mt-2">"{result.tagline}"</p>
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

        <p className="text-xs text-film-text-dim">
          Prochain film dans <NextGameCountdown />
        </p>
      </div>
    </Modal>
  )
}

function NextGameCountdown() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCHours(24, 0, 0, 0)
  const diff = tomorrow.getTime() - now.getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return <strong className="text-film-text">{h}h {m}min</strong>
}
