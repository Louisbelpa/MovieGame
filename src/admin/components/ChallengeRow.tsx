/**
 * admin/components/ChallengeRow.tsx
 * A single row in the calendar view (one per day over the next 30 days).
 */

import { useState, useRef, useEffect } from 'react'
import { RefreshCw, Trash2, Plus, Clapperboard, ChevronDown } from 'lucide-react'
import type { AdminChallenge, AdminFilm } from '../api'

interface ChallengeRowProps {
  /** ISO date "YYYY-MM-DD" */
  date: string
  challenge: AdminChallenge | null
  films: AdminFilm[]
  onSchedule: (date: string, filmId: number) => Promise<void>
  onUpdate: (challengeId: number, filmId: number) => Promise<void>
  onDelete: (challengeId: number) => Promise<void>
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

// ─── Film picker (searchable dropdown) ───────────────────────────────────────

interface FilmPickerProps {
  films: AdminFilm[]
  onSelect: (filmId: number) => void
  onCancel: () => void
  loading: boolean
}

function FilmPicker({ films, onSelect, onCancel, loading }: FilmPickerProps) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = films.filter((f) =>
    search.trim() === '' ||
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.director.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2 w-80">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un film..."
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      />

      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">Aucun résultat</p>
        ) : (
          filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedId(f.id)}
              className={[
                'w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-lg transition-colors',
                selectedId === f.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-gray-50 text-gray-800',
              ].join(' ')}
            >
              {f.image_url ? (
                <img
                  src={f.image_url}
                  alt=""
                  className="w-8 h-5 object-cover rounded border border-gray-100 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <Clapperboard size={10} className="text-gray-400" />
                </div>
              )}
              <span className="truncate">{f.title}</span>
              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{f.year}</span>
            </button>
          ))
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={selectedId === null || loading}
          onClick={() => selectedId !== null && onSelect(selectedId)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading && (
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
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
  onSchedule,
  onUpdate,
  onDelete,
}: ChallengeRowProps) {
  const [picking, setPicking] = useState(false)
  const [mutating, setMutating] = useState(false)

  const today = isToday(date)
  const past = isPast(date)

  async function handleSelect(filmId: number) {
    setMutating(true)
    try {
      if (challenge) {
        await onUpdate(challenge.id, filmId)
      } else {
        await onSchedule(date, filmId)
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

        {challenge ? (
          <>
            {/* Film thumbnail */}
            {challenge.film.image_url ? (
              <img
                src={challenge.film.image_url}
                alt={challenge.film.title}
                className="w-10 h-7 object-cover rounded border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <Clapperboard size={12} className="text-gray-400" />
              </div>
            )}

            {/* Film info */}
            <span className="text-sm font-medium text-gray-800 truncate flex-1">
              {challenge.film.title}
              <span className="ml-1.5 text-xs text-gray-400 font-normal">
                {challenge.film.year}
              </span>
            </span>

            {/* Actions */}
            {!past && (
              <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                <button
                  onClick={() => setPicking((p) => !p)}
                  title="Changer le film"
                  disabled={mutating}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={handleDelete}
                  title="Supprimer"
                  disabled={mutating}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  {mutating ? (
                    <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            )}
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

      {/* Film picker dropdown */}
      {picking && !past && (
        <div className="ml-[7.5rem]">
          <FilmPicker
            films={films}
            onSelect={handleSelect}
            onCancel={() => setPicking(false)}
            loading={mutating}
          />
        </div>
      )}
    </li>
  )
}
