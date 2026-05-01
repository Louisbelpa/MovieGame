/**
 * admin/components/ChallengeRow.tsx
 * A single row in the calendar view (one per day over the next 30 days).
 * Supports scheduling either a film or a TV series.
 */

import { useState, useRef, useEffect } from 'react'
import { RefreshCw, Trash2, Plus, Clapperboard, Tv, ChevronDown, AlertTriangle, History, Pencil } from 'lucide-react'
import type { AdminChallenge, AdminFilm, AdminSeries, MediaRef } from '../api'

interface ChallengeRowProps {
  date: string
  challenge: AdminChallenge | null
  films: AdminFilm[]
  seriesList: AdminSeries[]
  mediaType?: 'film' | 'series'
  onSchedule: (date: string, ref: MediaRef) => Promise<void>
  onUpdate: (challengeId: number, ref: MediaRef) => Promise<void>
  onDelete: (challengeId: number) => Promise<void>
  onEditMedia?: (media: AdminFilm | AdminSeries, type: 'film' | 'series') => void
  rowClassName?: string
  allowPast?: boolean
}

function formatDateShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function isToday(iso: string) {
  return iso === new Date().toISOString().slice(0, 10)
}

function isPast(iso: string) {
  return iso < new Date().toISOString().slice(0, 10)
}

// ─── Media picker (films + series in tabs) ────────────────────────────────────

type TabType = 'films' | 'series'

interface MediaPickerProps {
  films: AdminFilm[]
  seriesList: AdminSeries[]
  mediaType?: 'film' | 'series'
  onSelect: (ref: MediaRef) => void
  onCancel: () => void
  loading: boolean
}

function MediaPicker({ films, seriesList, mediaType, onSelect, onCancel, loading }: MediaPickerProps) {
  const [tab, setTab] = useState<TabType>(mediaType === 'series' ? 'series' : 'films')
  const [search, setSearch] = useState('')
  const [selectedRef, setSelectedRef] = useState<MediaRef | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSearch('')
    setSelectedRef(null)
  }, [tab])

  const filteredFilms = films.filter((f) =>
    search.trim() === '' ||
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.director.toLowerCase().includes(search.toLowerCase())
  )

  const filteredSeries = seriesList.filter((s) =>
    search.trim() === '' ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.creator.toLowerCase().includes(search.toLowerCase())
  )

  function isRefSelected(ref: MediaRef) {
    if (!selectedRef) return false
    if ('filmId' in ref && 'filmId' in selectedRef) return ref.filmId === selectedRef.filmId
    if ('seriesId' in ref && 'seriesId' in selectedRef) return (ref as { seriesId: number }).seriesId === (selectedRef as { seriesId: number }).seriesId
    return false
  }

  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2 w-full sm:w-80">
      {/* Tabs — hidden when mediaType is locked */}
      {!mediaType && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setTab('films')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-md transition-colors',
              tab === 'films' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <Clapperboard size={11} /> Films
          </button>
          <button
            type="button"
            onClick={() => setTab('series')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-md transition-colors',
              tab === 'series' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <Tv size={11} /> Séries
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={tab === 'films' ? 'Rechercher un film...' : 'Rechercher une série...'}
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      />

      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
        {tab === 'films' && (
          filteredFilms.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">Aucun résultat</p>
          ) : (
            filteredFilms.map((f) => {
              const ref: MediaRef = { filmId: f.id }
              const upcomingDates = (f.used_dates ?? []).filter((d) => d >= todayStr)
              const isDuplicate = upcomingDates.length > 0
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedRef(ref)}
                  className={[
                    'w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-lg transition-colors',
                    isRefSelected(ref) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-800',
                  ].join(' ')}
                >
                  {f.image_url ? (
                    <img src={f.image_url} alt="" className="w-8 h-5 object-cover rounded border border-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <Clapperboard size={10} className="text-gray-400" />
                    </div>
                  )}
                  <span className="truncate flex-1">{f.title}</span>
                  {isDuplicate && (
                    <span title={`Déjà planifié le ${upcomingDates[0]}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                      <AlertTriangle size={9} /> Doublon
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex-shrink-0">{f.year}</span>
                </button>
              )
            })
          )
        )}

        {tab === 'series' && (
          filteredSeries.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">Aucun résultat</p>
          ) : (
            filteredSeries.map((s) => {
              const ref: MediaRef = { seriesId: s.id }
              const upcomingDates = (s.used_dates ?? []).filter((d) => d >= todayStr)
              const isDuplicate = upcomingDates.length > 0
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedRef(ref)}
                  className={[
                    'w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-lg transition-colors',
                    isRefSelected(ref) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-800',
                  ].join(' ')}
                >
                  {s.image_url ? (
                    <img src={s.image_url} alt="" className="w-8 h-5 object-cover rounded border border-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <Tv size={10} className="text-gray-400" />
                    </div>
                  )}
                  <span className="truncate flex-1">{s.title}</span>
                  {isDuplicate && (
                    <span title={`Déjà planifié le ${upcomingDates[0]}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                      <AlertTriangle size={9} /> Doublon
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex-shrink-0">{s.year}</span>
                </button>
              )
            })
          )
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          Annuler
        </button>
        <button
          type="button"
          disabled={selectedRef === null || loading}
          onClick={() => selectedRef !== null && onSelect(selectedRef)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Confirmer
        </button>
      </div>
    </div>
  )
}

// ─── ChallengeRow ─────────────────────────────────────────────────────────────

export function ChallengeRow({
  date,
  challenge,
  films,
  seriesList,
  mediaType,
  onSchedule,
  onUpdate,
  onDelete,
  onEditMedia,
  rowClassName,
  allowPast = false,
}: ChallengeRowProps) {
  const [picking, setPicking] = useState(false)
  const [mutating, setMutating] = useState(false)

  const today = isToday(date)
  const past = allowPast ? false : isPast(date)

  const media = challenge?.film ?? challenge?.series ?? null
  const isSeries = !!(challenge?.series)

  async function handleSelect(ref: MediaRef) {
    setMutating(true)
    try {
      if (challenge) {
        await onUpdate(challenge.id, ref)
      } else {
        await onSchedule(date, ref)
      }
      setPicking(false)
    } finally {
      setMutating(false)
    }
  }

  async function handleDelete() {
    if (!challenge) return
    setMutating(true)
    try {
      await onDelete(challenge.id)
    } finally {
      setMutating(false)
    }
  }

  return (
    <li
      className={[
        'px-4 py-3 flex flex-col gap-2',
        today ? 'bg-indigo-50' : '',
        past ? 'opacity-60' : '',
        rowClassName ?? '',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        {/* Date badge */}
        <span
          className={[
            'text-xs font-semibold w-28 flex-shrink-0',
            today ? 'text-indigo-600' : 'text-gray-500',
          ].join(' ')}
        >
          {today ? "Aujourd'hui — " : ''}{formatDateShort(date)}
        </span>

        {media ? (
          <>
            {/* Thumbnail */}
            {media.image_url ? (
              <img
                src={media.image_url}
                alt={media.title}
                className="w-10 h-7 object-cover rounded border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                {isSeries
                  ? <Tv size={12} className="text-gray-400" />
                  : <Clapperboard size={12} className="text-gray-400" />
                }
              </div>
            )}

            {/* Title + media type badge */}
            <span className="text-sm font-medium text-gray-800 truncate flex-1">
              {media.title}
              <span className="ml-1.5 text-xs text-gray-400 font-normal">{media.year}</span>
              {isSeries && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-purple-100 text-purple-700">
                  <Tv size={9} /> Série
                </span>
              )}
            </span>

            {/* Doublon / Joué badges */}
            {(() => {
              const todayStr = new Date().toISOString().slice(0, 10)
              const usedDates = media.used_dates ?? []
              const pastPlays = usedDates.filter((d) => d < todayStr)
              const otherDates = usedDates.filter((d) => d >= todayStr && d !== date)
              return (
                <>
                  {pastPlays.length > 0 && (
                    <span title={`Joué le ${pastPlays[0]}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
                      <History size={9} /> Joué {pastPlays.length}×
                    </span>
                  )}
                  {otherDates.length > 0 && (
                    <span title={`Aussi planifié le ${otherDates[0]}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                      <AlertTriangle size={9} /> Doublon
                    </span>
                  )}
                </>
              )
            })()}

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              {onEditMedia && (
                <button
                  onClick={() => onEditMedia(media, isSeries ? 'series' : 'film')}
                  title="Modifier la fiche"
                  className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Pencil size={15} />
                </button>
              )}
              {!past && (
                <>
                  <button
                    onClick={() => setPicking((p) => !p)}
                    title="Changer le contenu"
                    disabled={mutating}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={handleDelete}
                    title="Supprimer"
                    disabled={mutating}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  >
                    {mutating ? (
                      <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-400 italic flex-1">Libre</span>
            {!past && (
              <button
                onClick={() => setPicking((p) => !p)}
                disabled={mutating}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors ml-auto flex-shrink-0 disabled:opacity-40"
              >
                <Plus size={12} />
                Planifier
                <ChevronDown size={12} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Media picker dropdown */}
      {picking && !past && (
        <div className="ml-0 sm:ml-[7.5rem]">
          <MediaPicker
            films={films}
            seriesList={seriesList}
            mediaType={mediaType}
            onSelect={handleSelect}
            onCancel={() => setPicking(false)}
            loading={mutating}
          />
        </div>
      )}
    </li>
  )
}
