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
  const personTypeLabel = (() => {
    switch (result.personType) {
      case 'sportsperson': return 'Sportif·ve'
      case 'artist': return 'Artiste'
      case 'scientist': return 'Scientifique'
      case 'entrepreneur': return 'Entrepreneur·e'
      case 'writer': return 'Écrivain·e'
      case 'historical_figure': return 'Personnalité historique'
      default: return 'Politicien·ne'
    }
  })()

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

        {/* Person reveal card (article-like) */}
        <div className="w-full film-border rounded-xl overflow-hidden bg-film-black/40">
          {result.photoUrl && (
            <img src={result.photoUrl} alt={result.name} crossOrigin="anonymous" referrerPolicy="no-referrer"
              className="w-full h-40 object-cover object-top" />
          )}
          <div className="p-3 text-left">
            <p className="text-[10px] uppercase tracking-wider text-film-text-dim mb-1">Article Wikipédia</p>
            <p className="font-title text-xl font-semibold text-film-text leading-tight">
              {result.name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge variant="gold">{personTypeLabel}</Badge>
            </div>
            {result.extract && (
              <div className="mt-3 pt-2 border-t border-film-border/50">
                <p className="text-[10px] uppercase tracking-wider text-film-text-dim mb-1">Résumé</p>
                <p className="text-sm text-film-text-dim line-clamp-4">{result.extract}</p>
              </div>
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
            className="flex items-center gap-1.5 text-sm text-film-text-dim hover:text-film-text transition-colors">
            <ExternalLink size={12} />
            En savoir plus sur Wikipédia
          </a>
        )}

        <p className="text-sm text-film-text-dim">
          Prochain défi à minuit heure de Paris
        </p>
      </div>
    </Modal>
  )
}
