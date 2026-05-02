import { Share2, XCircle, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useWikiStore } from '@/store/wikiStore'

export function WikiLoseModal() {
  const isOpen = useWikiStore((s) => s.ui.isModalOpen && s.ui.modalType === 'lose')
  const closeModal = useWikiStore((s) => s.closeModal)
  const shareResult = useWikiStore((s) => s.shareResult)
  const result = useWikiStore((s) => s.result)

  if (!result) return null

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
    <Modal isOpen={isOpen} onClose={closeModal} ariaLabel="Défi échoué">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-film-red/10 border border-film-red/30 flex items-center justify-center">
          <XCircle size={32} className="text-film-red" />
        </div>

        <div>
          <p className="text-film-text font-semibold text-lg">Pas cette fois…</p>
          <p className="text-film-text-dim text-sm mt-1">Vous découvrirez la réponse ci-dessous</p>
        </div>

        <div className="w-full film-border rounded-xl overflow-hidden bg-film-black/40">
          {result.photoUrl && (
            <img src={result.photoUrl} alt={result.name} crossOrigin="anonymous" referrerPolicy="no-referrer"
              className="w-full h-40 object-cover object-top" />
          )}
          <div className="p-3 text-left">
            <p className="text-xs uppercase tracking-wider text-film-text-dim mb-1">Article Wikipédia</p>
            <p className="font-title text-xl font-semibold text-film-text leading-tight">
              {result.name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge variant="gold">{personTypeLabel}</Badge>
            </div>
            {result.extract && (
              <div className="mt-3 pt-2 border-t border-film-border/50">
                <p className="text-xs uppercase tracking-wider text-film-text-dim mb-1">Résumé</p>
                <p className="text-xs text-film-text-dim line-clamp-4">{result.extract}</p>
              </div>
            )}
          </div>
        </div>

        <Button variant="secondary" size="md" onClick={shareResult} className="w-full">
          <Share2 size={15} />
          Partager
        </Button>

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
