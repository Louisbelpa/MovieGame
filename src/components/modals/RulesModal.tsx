/**
 * modals/RulesModal.tsx
 * How-to-play explanation shown on first visit.
 */

import { CheckCircle2, XCircle, SkipForward, Calendar, Clapperboard, User } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'

const RULES_SEEN_KEY = 'cineguess:rules_seen'

export function RulesModal() {
  const isOpen = useGameStore((s) => s.ui.isModalOpen && s.ui.modalType === 'rules')
  const closeModal = useGameStore((s) => s.closeModal)
  const status = useGameStore((s) => s.status)
  const openModal = useGameStore((s) => s.openModal)

  function handleClose() {
    // Mark as seen only when the user explicitly closes the tutorial
    localStorage.setItem(RULES_SEEN_KEY, '1')
    closeModal()
    // If the game was already finished while the tutorial was open, show the result modal now
    if (status === 'won') setTimeout(() => openModal('win'), 300)
    else if (status === 'lost') setTimeout(() => openModal('lose'), 300)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Comment jouer ?">
      <div className="flex flex-col gap-5 text-sm text-film-text">

        {/* Principle */}
        <div className="flex flex-col gap-1">
          <p className="text-film-text-dim leading-relaxed">
            Une photo de film floue s'affiche. Vous avez{' '}
            <strong className="text-film-gold">3 tentatives</strong> pour deviner le film.
            À chaque mauvaise réponse, un nouvel indice se débloque et l'image devient plus nette.
          </p>
        </div>

        {/* Image blur progression */}
        <div className="film-border rounded-lg p-3">
          <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-2.5">
            L'image se révèle à chaque essai
          </p>
          <div className="flex items-end gap-1.5">
            {[
              { label: 'Départ', opacity: 'opacity-20', size: 'h-5' },
              { label: 'Essai 1', opacity: 'opacity-40', size: 'h-7' },
              { label: 'Essai 2', opacity: 'opacity-70', size: 'h-9' },
              { label: 'Fin', opacity: 'opacity-100', size: 'h-11' },
            ].map(({ label, opacity, size }) => (
              <div key={label} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-full rounded bg-film-gold ${opacity} ${size} transition-all`} />
                <span className="text-[9px] text-film-text-dim">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hints order */}
        <div className="film-border rounded-lg p-3">
          <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-2.5">
            Ordre des indices
          </p>
          <div className="flex flex-col gap-2">
            <HintPreview icon={<Calendar size={13} className="text-film-gold" />} label="1er mauvaise réponse" hint="Année de sortie" example="1994" />
            <HintPreview icon={<Clapperboard size={13} className="text-film-gold" />} label="2e mauvaise réponse" hint="Réalisateur" example="Frank Darabont" />
            <HintPreview icon={<User size={13} className="text-film-gold" />} label="3e mauvaise réponse" hint="Acteur principal" example="Tim Robbins" />
          </div>
        </div>

        {/* Result icons */}
        <ul className="flex flex-col gap-2.5">
          <RuleItem
            icon={<CheckCircle2 size={16} className="text-film-green" />}
            title="Bonne réponse"
            description="La cellule passe au vert — partie terminée !"
          />
          <RuleItem
            icon={<XCircle size={16} className="text-film-red" />}
            title="Mauvaise réponse"
            description="Un nouvel indice est débloqué et l'image s'éclaircit."
          />
          <RuleItem
            icon={<SkipForward size={16} className="text-film-text-dim" />}
            title="Passer"
            description="Utilise une tentative pour débloquer l'indice suivant."
          />
        </ul>

        <p className="text-xs text-film-text-dim text-center">
          Un nouveau film chaque jour à minuit (heure de Paris).
          Vous pouvez aussi rejouer les anciens défis avec les flèches ◀ ▶.
        </p>

        <Button variant="primary" size="lg" onClick={handleClose} className="w-full">
          C'est parti !
        </Button>
      </div>
    </Modal>
  )
}

function HintPreview({
  icon,
  label,
  hint,
  example,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  example: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] text-film-text-dim">{label}</p>
          <p className="text-xs font-semibold text-film-text">{hint}</p>
        </div>
        <span className="text-xs text-film-text-dim italic shrink-0">ex : {example}</span>
      </div>
    </div>
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
        <p className="text-film-text-dim text-xs">{description}</p>
      </div>
    </li>
  )
}
