/**
 * admin/components/BackdropPicker.tsx
 * Modal gallery for picking a TMDB backdrop as the film's image_url.
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getFilmBackdrops, type TmdbBackdrop } from '../api'

interface BackdropPickerProps {
  filmId: number
  onSelect: (imageUrl: string) => void
  onClose: () => void
}

export function BackdropPicker({ filmId, onSelect, onClose }: BackdropPickerProps) {
  const [backdrops, setBackdrops] = useState<TmdbBackdrop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getFilmBackdrops(filmId)
      .then(setBackdrops)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des backdrops.')
      )
      .finally(() => setLoading(false))
  }, [filmId])

  function handleSelect(backdrop: TmdbBackdrop) {
    onSelect(backdrop.url)
    onClose()
  }

  return (
    /* Backdrop overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            Choisir un backdrop TMDB
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && backdrops.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-10">
              Aucun backdrop disponible pour ce film.
            </p>
          )}

          {!loading && !error && backdrops.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {backdrops.map((backdrop) => (
                <button
                  key={backdrop.path}
                  onClick={() => handleSelect(backdrop)}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <img
                    src={backdrop.url}
                    alt={backdrop.path}
                    className="w-full object-cover aspect-video group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  {backdrop.vote_average > 0 && (
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {backdrop.vote_average.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
