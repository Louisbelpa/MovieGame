/**
 * modals/RulesModal.tsx
 * How-to-play explanation shown on first visit.
 */

import { CheckCircle2, XCircle, SkipForward, Calendar, Clapperboard, User, Image } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'

export function RulesModal() {
  const isOpen = useGameStore((s) => s.ui.isModalOpen && s.ui.modalType === 'rules')
  const closeModal = useGameStore((s) => s.closeModal)

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Comment jouer ?">
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
          <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Image size={12} />
            Progression de l'image
          </p>
          <div className="flex items-center gap-1.5">
            {[24, 14, 4, 0].map((blur, i) => (
              <div key={blur} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-full h-10 rounded bg-film-surface border border-film-border flex items-center justify-center text-[9px] text-film-text-dim font-mono"
                  style={{ filter: blur > 0 ? `blur(${Math.min(blur / 3, 4)}px)` : 'none' }}
                >
                  🎬
                </div>
                <span className="text-[9px] text-film-text-dim text-center">
                  {i === 0 ? 'Départ' : i === 3 ? 'Fin' : `Essai ${i}`}
                </span>
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

        <Button variant="primary" size="lg" onClick={closeModal} className="w-full">
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
