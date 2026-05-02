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
    localStorage.setItem(RULES_SEEN_KEY, '1')
    closeModal()
    if (status === 'won') setTimeout(() => openModal('win'), 300)
    else if (status === 'lost') setTimeout(() => openModal('lose'), 300)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Comment jouer ?">
      <div className="flex flex-col gap-5 text-sm text-film-text">

        {/* Principle */}
        <p className="text-film-text-dim leading-relaxed">
          Une image tirée d'un film s'affiche.
          <br/>Devinez le film en{' '}
          <strong className="text-film-gold">5 tentatives maximum</strong>.
          À chaque mauvaise réponse, un nouvel indice se débloque.
        </p>

        {/* Hints order */}
        <div className="film-border rounded-lg p-3">
          <p className="text-sm font-semibold text-film-text-dim uppercase tracking-wider mb-2.5">
            Ordre des indices
          </p>
          <div className="flex flex-col gap-2">
            <HintPreview icon={<Calendar size={13} className="text-film-gold" />} label="1re mauvaise réponse" hint="Année de sortie" example="1994" />
            <HintPreview icon={<Clapperboard size={13} className="text-film-gold" />} label="2e mauvaise réponse" hint="Réalisateur" example="Frank Darabont" />
            <HintPreview icon={<User size={13} className="text-film-gold" />} label="3e mauvaise réponse" hint="Acteur principal" example="Tim Robbins" />
          </div>
        </div>

        {/* Attempt status indicators */}
        <div className="film-border rounded-lg p-3">
          <p className="text-sm font-semibold text-film-text-dim uppercase tracking-wider mb-2.5">
            Signification des pastilles
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-5 h-5 rounded-full bg-film-green flex items-center justify-center text-film-black font-bold text-[10px]">✓</span>
              <span className="text-film-text">Correct</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-5 h-5 rounded-full bg-film-red flex items-center justify-center text-white font-bold text-[10px]">✗</span>
              <span className="text-film-text">Incorrect</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-5 h-5 rounded-full bg-film-border/60 flex items-center justify-center text-film-text-dim text-[10px]">→</span>
              <span className="text-film-text">Passé</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-dashed border-film-border/50 inline-block" />
              <span className="text-film-text-dim">Vide</span>
            </span>
          </div>
        </div>

        {/* Result icons */}
        <ul className="flex flex-col gap-2.5">
          <RuleItem
            icon={<CheckCircle2 size={16} className="text-film-green" />}
            title="Bonne réponse"
            description="La pastille verte s'allume — partie terminée !"
          />
          <RuleItem
            icon={<XCircle size={16} className="text-film-red" />}
            title="Mauvaise réponse"
            description="Pastille rouge. Un nouvel indice se débloque."
          />
          <RuleItem
            icon={<SkipForward size={16} className="text-film-text-dim" />}
            title="Passer"
            description="Utilise une tentative pour débloquer l'indice suivant sans proposer de titre."
          />
        </ul>

        <p className="text-sm text-film-text-dim text-center">
          Un nouveau film chaque jour à minuit (heure de Paris).<br/>
          Rejoue les anciens défis avec les flèches ◀ ▶.
        </p>

        <Button variant="primary" size="lg" onClick={handleClose} className="w-full">
          C'est parti !
        </Button>
      </div>
    </Modal>
  )
}

function HintPreview({
  icon, label, hint, example,
}: {
  icon: React.ReactNode; label: string; hint: string; example: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-film-text-dim">{label}</p>
          <p className="text-xs font-semibold text-film-text">{hint}</p>
        </div>
        <span className="text-sm text-film-text-dim italic shrink-0">ex : {example}</span>
      </div>
    </div>
  )
}

function RuleItem({
  icon, title, description,
}: {
  icon: React.ReactNode; title: string; description: string
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-semibold text-film-text">{title}</p>
        <p className="text-film-text-dim text-sm">{description}</p>
      </div>
    </li>
  )
}
