import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { WikiChallengeImage } from '@/components/wiki/WikiChallengeImage'
import { WikiHintPanel } from '@/components/wiki/WikiHintPanel'
import { AttemptTracker } from '@/components/game/AttemptTracker'
import { Spinner } from '@/components/ui/Spinner'
import type { WikiChallengePayload, WikiHintPayload, WikiVisibleProfile } from '@/api/wikiClient'
import {
  fetchWikiGamePreview,
  fetchWikiPoolEntryGamePreview,
  postWikiPersonDraftPreview,
  type WikiPersonDraftPreviewBody,
} from '../api'

function resolvePhotoForPreview(url: string | null): string | null {
  if (!url?.trim()) return null
  const v = url.trim()
  if (v.startsWith('http') || v.startsWith('/uploads/')) return v
  return v
}

interface WikiGamePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  /** Aperçu sans enregistrer (prioritaire sur les autres sources) */
  draft?: WikiPersonDraftPreviewBody | null
  /** Fiche `wiki_persons` en base */
  personId?: number | null
  /** Ligne du pool prefetch (`wiki_prefetch_pool`) — mutuellement exclusif avec `personId` en pratique */
  poolEntryId?: number | null
}

export function WikiGamePreviewModal({
  isOpen,
  onClose,
  draft = null,
  personId = null,
  poolEntryId = null,
}: WikiGamePreviewModalProps) {
  const [payload, setPayload] = useState<WikiChallengePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draftKey = draft ? JSON.stringify(draft) : ''
  const previewSource: 'draft' | 'person' | 'pool' | null =
    draft && draft.name.trim()
      ? 'draft'
      : poolEntryId != null && poolEntryId > 0
        ? 'pool'
        : personId != null && personId > 0
          ? 'person'
          : null

  useEffect(() => {
    if (!isOpen || previewSource === null) {
      setPayload(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const promise =
      previewSource === 'draft' && draft
        ? postWikiPersonDraftPreview(draft)
        : previewSource === 'pool' && poolEntryId != null
          ? fetchWikiPoolEntryGamePreview(poolEntryId)
          : personId != null
            ? fetchWikiGamePreview(personId)
            : Promise.reject(new Error('Aucune source d’aperçu'))
    void promise
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
  }, [isOpen, previewSource, draftKey, personId, poolEntryId])

  const profile = payload?.profile as WikiVisibleProfile | undefined
  const hints = (payload?.hints ?? []) as WikiHintPayload[]
  const hintsAvailable = payload?.hintsAvailable ?? 0
  const hintsRevealed = payload?.hintsRevealed ?? 0
  const wikiPersonType = payload?.personType

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Aperçu du défi Personnalités"
      title="Aperçu du défi Personnalités"
      className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[min(90dvh,900px)] overflow-hidden flex flex-col bg-film-black text-film-text border border-film-border shadow-xl"
    >
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3" data-mode="wiki">
        <p className="text-xs text-amber-200/95 bg-amber-950/50 border border-amber-700/40 rounded-lg px-3 py-2">
          {previewSource === 'draft' ? (
            <>
              Aperçu des <strong className="font-semibold">champs actuels</strong> (même normalisation qu’à l’enregistrement). Rien n’est écrit en base.{' '}
            </>
          ) : previewSource === 'pool' ? (
            <>
              Aperçu basé sur le <strong className="font-semibold">JSON du pool prefetch</strong> (pas la fiche enregistrée). Aucune tentative n’est enregistrée.{' '}
            </>
          ) : (
            <>
              Aperçu basé sur la <strong className="font-semibold">fiche enregistrée</strong> en base. Aucune tentative n’est enregistrée.{' '}
            </>
          )}
          <strong className="font-semibold">Tous les indices sont affichés</strong> (aperçu admin).
        </p>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Spinner size="lg" />
            <p className="text-sm text-film-text-dim">Préparation du rendu…</p>
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-film-red">{error}</p>
        )}

        {!loading && !error && payload && profile && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-film-text-dim">Pendant la partie</p>
                <WikiChallengeImage imageUrl={resolvePhotoForPreview(payload.photoUrl)} isRevealed={false} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-film-text-dim">Après la partie (révélation)</p>
                <WikiChallengeImage imageUrl={resolvePhotoForPreview(payload.photoUrl)} isRevealed />
              </div>
            </div>
            <WikiHintPanel
              profile={profile}
              hints={[]}
              hintsAvailable={hintsAvailable}
              hintsRevealed={hintsRevealed}
              showHints={false}
              wikiPersonType={wikiPersonType}
            />
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <AttemptTracker
                  guesses={[]}
                  maxAttempts={payload.maxAttempts}
                />
                <span className="text-sm text-film-text-dim font-mono">0/{payload.maxAttempts}</span>
              </div>
              <div
                className="flex items-center gap-2 p-3 pl-3 rounded-xl film-border opacity-60"
                style={{
                  border: '1px solid var(--film-border)',
                }}
                aria-hidden
              >
                <span className="text-sm text-film-text-dim flex-1">Champ de réponse (désactivé en aperçu)</span>
              </div>
            </section>
            <WikiHintPanel
              profile={profile}
              hints={hints}
              hintsAvailable={hintsAvailable}
              hintsRevealed={hintsRevealed}
              showProfile={false}
              wikiPersonType={wikiPersonType}
            />
          </>
        )}
      </div>
    </Modal>
  )
}

/** Bouton pour ouvrir la modale depuis le formulaire (brouillon = contenu actuel du formulaire). */
export function WikiGamePreviewOpenButton({
  onOpen,
  disabled,
}: {
  onOpen: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      title={disabled ? 'Renseigne au moins le nom pour l’aperçu' : undefined}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Eye size={16} aria-hidden />
      Prévisualiser le rendu
    </button>
  )
}
