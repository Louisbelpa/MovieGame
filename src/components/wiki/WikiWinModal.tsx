import { motion } from 'framer-motion'
import { Share2, Trophy, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useWikiStore } from '@/store/wikiStore'

export function WikiWinModal() {
  const isOpen = useWikiStore((s) => s.ui.isModalOpen && s.ui.modalType === 'win')
  const closeModal = useWikiStore((s) => s.closeModal)
  const shareResult = useWikiStore((s) => s.shareResult)
  const result = useWikiStore((s) => s.result)
  const guesses = useWikiStore((s) => s.guesses)

  if (!result) return null

  const correctAttempt = guesses.findIndex((g) => g.status === 'correct') + 1
  const maxAttempts = result.maxAttempts
  const personTypeLabel = result.personType === 'sportsperson' ? 'Sportif·ve' : 'Politicien·ne'

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <div className="flex flex-col items-center gap-5 text-center">
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

        {/* Person reveal card */}
        <div className="w-full film-border rounded-xl overflow-hidden">
          {result.photoUrl && (
            <img src={result.photoUrl} alt={result.name}
              className="w-full h-40 object-cover object-top" />
          )}
          <div className="p-3 text-left">
            <p className="font-title text-lg font-semibold text-film-text leading-tight">
              {result.name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge variant="gold">{personTypeLabel}</Badge>
            </div>
            {result.extract && (
              <p className="text-xs text-film-text-dim mt-2 line-clamp-3">{result.extract}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <Button variant="primary" size="md" onClick={shareResult} className="flex-1">
            <Share2 size={15} />
            Partager
          </Button>
        </div>

        {result.wikipediaUrl && (
          <a href={result.wikipediaUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-film-text-dim hover:text-film-text transition-colors">
            <ExternalLink size={12} />
            En savoir plus sur Wikipédia
          </a>
        )}

        <p className="text-xs text-film-text-dim">
          Prochain défi à minuit heure de Paris
        </p>
      </div>
    </Modal>
  )
}
