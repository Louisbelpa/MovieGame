import { Tv, Landmark } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'cineguess:new_modes_series_wiki_v1'

function markNewModesAnnouncementSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export type NewModesAnnouncementVariant = 'both' | 'series' | 'wiki'

interface NewModesAnnouncementModalProps {
  isOpen: boolean
  onClose: () => void
  variant: NewModesAnnouncementVariant
}

export function NewModesAnnouncementModal({ isOpen, onClose, variant }: NewModesAnnouncementModalProps) {
  const modalDescId = 'modal-desc-new-modes'

  function handleClose() {
    markNewModesAnnouncementSeen()
    onClose()
  }

  const title =
    variant === 'both'
      ? 'Deux nouveaux modes de jeu'
      : variant === 'series'
        ? 'Nouveau : mode Séries'
        : 'Nouveau : mode Wikipedia'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      ariaDescribedBy={modalDescId}
    >
      <div className="flex flex-col gap-5 text-sm text-film-text">
        {variant === 'both' && (
          <p id={modalDescId} className="text-film-text-dim leading-relaxed">
            Tu peux maintenant jouer au défi du jour en <strong className="text-film-text">Séries</strong> et deviner une{' '}
            <strong className="text-film-text">personnalité</strong> grâce au mode Wikipedia — mêmes idées : indices
            progressifs et tentatives limitées.
          </p>
        )}
        {variant === 'series' && (
          <p id={modalDescId} className="text-film-text-dim leading-relaxed">
            Le <strong className="text-film-text">mode Séries</strong> est disponible : une image, des tentatives et des
            indices qui se débloquent comme pour les films.
          </p>
        )}
        {variant === 'wiki' && (
          <p id={modalDescId} className="text-film-text-dim leading-relaxed">
            Le <strong className="text-film-text">mode Wikipedia</strong> te propose de deviner la personnalité du jour
            à partir d&apos;indices issus de sa biographie.
          </p>
        )}

        {variant === 'both' && (
          <ul className="film-border rounded-lg p-3 flex flex-col gap-3" aria-label="Nouveaux modes">
            <li className="flex gap-3 items-start">
              <span
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border border-[#33bc97]/40"
                style={{ background: 'rgba(30, 176, 136, 0.18)' }}
              >
                <Tv size={18} style={{ color: 'var(--sg-series)' }} aria-hidden />
              </span>
              <span className="text-film-text-dim leading-relaxed pt-1">
                <span className="text-film-text font-medium">Séries</span> — devine le titre de la série du jour.
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border border-[#a78bfa]/45"
                style={{ background: 'rgba(139, 92, 246, 0.18)' }}
              >
                <Landmark size={18} className="text-[#c4b5fd]" aria-hidden />
              </span>
              <span className="text-film-text-dim leading-relaxed pt-1">
                <span className="text-film-text font-medium">Wikipedia</span> — devine la personnalité à partir de son
                parcours.
              </span>
            </li>
          </ul>
        )}

        <div className={cn('flex flex-col gap-2', variant !== 'both' && 'pt-0')}>
          <Button variant="primary" size="lg" onClick={handleClose} className="w-full">
            Compris
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export const NEW_MODES_ANNOUNCEMENT_STORAGE_KEY = STORAGE_KEY
