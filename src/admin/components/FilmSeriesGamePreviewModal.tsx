import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { MovieImage } from '@/components/game/MovieImage'
import { HintPanel } from '@/components/game/HintPanel'
import { AttemptTracker } from '@/components/game/AttemptTracker'
import { Spinner } from '@/components/ui/Spinner'
import type { ChallengePayload, HintPayload } from '@/api/client'
import {
  fetchFilmGamePreview,
  fetchSeriesGamePreview,
  postFilmSeriesGamePreviewDraft,
  type FilmSeriesGamePreviewDraftBody,
} from '../api'

interface FilmSeriesGamePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'film' | 'series'
  /** Prioritaire : valeurs courantes du formulaire (indices à jour sans enregistrer). */
  draft?: FilmSeriesGamePreviewDraftBody | null
  /** Secours si pas de brouillon exploitable (ex. ancien flux). */
  mediaId?: number | null
}

export function FilmSeriesGamePreviewModal({
  isOpen,
  onClose,
  mode,
  draft = null,
  mediaId = null,
}: FilmSeriesGamePreviewModalProps) {
  const [payload, setPayload] = useState<ChallengePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const draftKey = draft ? JSON.stringify(draft) : ''
  const fromForm = draft !== null

  useEffect(() => {
    if (!isOpen) {
      setPayload(null)
      setError(null)
      return
    }
    if (draft !== null) {
      let cancelled = false
      setLoading(true)
      setError(null)
      void postFilmSeriesGamePreviewDraft({ ...draft, mode })
        .then((data) => {
          if (!cancelled) setPayload(data)
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Impossible de charger l’aperçu')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }
    if (mediaId) {
      let cancelled = false
      setLoading(true)
      setError(null)
      const fetchFn = mode === 'film' ? fetchFilmGamePreview(mediaId) : fetchSeriesGamePreview(mediaId)
      void fetchFn
        .then((data) => {
          if (!cancelled) setPayload(data)
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Impossible de charger l’aperçu')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }
    setPayload(null)
    setLoading(false)
    setError('Données insuffisantes pour l’aperçu.')
  }, [isOpen, mode, mediaId, draftKey])

  const hints = (payload?.hints ?? []) as HintPayload[]
  const hintsAvailable = payload?.hintsAvailable ?? 0
  const hintsRevealed = payload?.hintsRevealed ?? 0
  const title = mode === 'film' ? 'Aperçu du défi film' : 'Aperçu du défi série'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={title}
      title={title}
      className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[min(90dvh,900px)] overflow-hidden flex flex-col bg-film-black text-film-text border border-film-border shadow-xl"
    >
      <div
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3"
        data-mode={mode}
      >
        <p className="text-xs text-amber-200/95 bg-amber-950/50 border border-amber-700/40 rounded-lg px-3 py-2">
          {fromForm ? (
            <>
              Aperçu basé sur le <strong className="font-semibold">formulaire actuel</strong> (indices et champs à jour sans enregistrer).
            </>
          ) : (
            <>
              Aperçu basé sur la <strong className="font-semibold">fiche enregistrée</strong>.
            </>
          )}{' '}
          Aucune tentative n’est enregistrée.{' '}
          <strong className="font-semibold">Tous les indices prévus sont affichés</strong> (aperçu admin).
        </p>

        <p className="text-xs text-film-text-dim">
          Contrairement au mode Personnalités, l’image film/série reste affichée telle quelle pendant la partie (pas de flou).
        </p>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Spinner size="lg" />
            <p className="text-sm text-film-text-dim">Préparation du rendu…</p>
          </div>
        )}

        {error && !loading && <p className="text-sm text-film-red">{error}</p>}

        {!loading && !error && payload && (
          <>
            <MovieImage imageUrl={payload.imageUrl || null} attempt={1} />
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <AttemptTracker guesses={[]} maxAttempts={payload.maxAttempts} />
                <span className="text-sm text-film-text-dim font-mono">0/{payload.maxAttempts}</span>
              </div>
              <div
                className="flex items-center gap-2 p-3 rounded-xl film-border opacity-60"
                aria-hidden
              >
                <span className="text-sm text-film-text-dim flex-1">Champ de réponse (désactivé en aperçu)</span>
              </div>
            </section>
            <HintPanel hints={hints} hintsAvailable={hintsAvailable} hintsRevealed={hintsRevealed} />
          </>
        )}
      </div>
    </Modal>
  )
}

export function FilmSeriesPreviewOpenButton({
  mode,
  onOpen,
  disabled,
}: {
  mode: 'film' | 'series'
  onOpen: () => void
  disabled?: boolean
}) {
  const cls =
    mode === 'film'
      ? 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
      : 'text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100'
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg ${cls} disabled:opacity-50 disabled:pointer-events-none`}
    >
      <Eye size={16} aria-hidden />
      Prévisualiser le rendu
    </button>
  )
}
