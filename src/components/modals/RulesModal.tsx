/**
 * modals/RulesModal.tsx
 * How-to-play explanation shown on first visit.
 */

import { CheckCircle2, XCircle, SkipForward } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'

export function RulesModal() {
  const isOpen = useGameStore((s) => s.ui.isModalOpen && s.ui.modalType === 'rules')
  const closeModal = useGameStore((s) => s.closeModal)

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Comment jouer">
      <div className="flex flex-col gap-4 text-sm text-film-text">
        <p className="text-film-text-dim leading-relaxed">
          Devinez le film du jour en{' '}
          <strong className="text-film-gold">6 tentatives maximum</strong>.
          Chaque mauvaise réponse débloque un nouvel indice et améliore la netteté de l'image.
        </p>

        <ul className="flex flex-col gap-3">
          <RuleItem
            icon={<CheckCircle2 size={16} className="text-film-green" />}
            title="Bonne réponse"
            description="La cellule passe au vert et la partie s'arrête."
          />
          <RuleItem
            icon={<XCircle size={16} className="text-film-red" />}
            title="Mauvaise réponse"
            description="Un indice supplémentaire est révélé. L'image devient plus nette."
          />
          <RuleItem
            icon={<SkipForward size={16} className="text-film-text-dim" />}
            title="Passer"
            description="Vous utilisez une tentative sans proposer de titre."
          />
        </ul>

        <div className="film-border rounded-lg p-3 text-xs text-film-text-dim">
          <p className="font-semibold text-film-text mb-1">Ordre des indices</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Image très floue</li>
            <li>Année de sortie</li>
            <li>Réalisateur</li>
            <li>Genres</li>
            <li>Acteurs principaux</li>
            <li>Accroche / Synopsis</li>
          </ol>
        </div>

        <p className="text-xs text-film-text-dim text-center">
          Un nouveau film chaque jour à minuit (UTC).
        </p>

        <Button variant="primary" size="lg" onClick={closeModal} className="w-full">
          C'est parti !
        </Button>
      </div>
    </Modal>
  )
}

function RuleItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-semibold text-film-text">{title}</p>
        <p className="text-film-text-dim">{description}</p>
      </div>
    </li>
  )
}
