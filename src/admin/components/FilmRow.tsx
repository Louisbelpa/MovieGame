/**
 * admin/components/FilmRow.tsx
 * A single row in the films table.
 * Shows a "Joué" badge for films that have been used in a past challenge.
 */

import { useRef } from 'react'
import { Pencil, Trash2, Clapperboard, Images, Upload, History } from 'lucide-react'
import type { AdminFilm } from '../api'

function resolveThumb(url: string): string {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('/uploads/')) return url
  return `https://image.tmdb.org/t/p/w300${url}`
}

function getTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

interface FilmRowProps {
  film: AdminFilm
  onEdit: (film: AdminFilm) => void
  onDelete: (film: AdminFilm) => void
  onBackdrops: (film: AdminFilm) => void
  onUpload: (film: AdminFilm, file: File) => void
}

export function FilmRow({ film, onEdit, onDelete, onBackdrops, onUpload }: FilmRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const today = getTodayStr()
  const pastDates = (film.used_dates ?? []).filter((d) => d <= today)
  const upcomingDates = (film.used_dates ?? []).filter((d) => d > today)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(film, file)
    e.target.value = ''
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Thumbnail */}
      <td className="px-3 py-3 w-20">
        {film.image_url ? (
          <img
            src={resolveThumb(film.image_url)}
            alt={film.title}
            className="w-16 h-10 object-cover rounded-md border border-gray-200"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-16 h-10 bg-gray-100 rounded-md flex items-center justify-center">
            <Clapperboard size={14} className="text-gray-400" />
          </div>
        )}
      </td>

      {/* Title */}
      <td className="px-3 py-3 text-sm font-medium text-gray-900">
        <div className="flex flex-col gap-0.5">
          <span className="truncate max-w-[180px]">{film.title}</span>
          <div className="flex flex-wrap gap-1">
            {pastDates.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-700">
                <History size={9} />
                Joué {pastDates.length}×
              </span>
            )}
            {upcomingDates.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
                Planifié
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Year */}
      <td className="px-3 py-3 text-sm text-gray-600 tabular-nums hidden sm:table-cell">{film.year}</td>

      {/* Director */}
      <td className="px-3 py-3 text-sm text-gray-600 hidden md:table-cell">
        <span className="truncate max-w-[140px] block">{film.director}</span>
      </td>

      {/* Status */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <div className="flex flex-col gap-1">
          <span className={[
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            film.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
          ].join(' ')}>
            {film.is_active ? 'Actif' : 'Inactif'}
          </span>
          <span className="text-xs text-amber-500">
            {'\u2605'.repeat(film.fame_level ?? 3)}{'\u2606'.repeat(5 - (film.fame_level ?? 3))}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button onClick={() => fileInputRef.current?.click()} title="Uploader une image" className="p-2 sm:p-1.5 bg-teal-50 text-teal-600 sm:bg-transparent sm:text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
            <Upload size={14} />
          </button>
          <button onClick={() => onBackdrops(film)} title="Backdrops TMDB" className="p-2 sm:p-1.5 bg-amber-50 text-amber-600 sm:bg-transparent sm:text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
            <Images size={14} />
          </button>
          <button onClick={() => onEdit(film)} title="Modifier" className="p-2 sm:p-1.5 bg-indigo-50 text-indigo-600 sm:bg-transparent sm:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(film)} title="Supprimer" className="p-2 sm:p-1.5 bg-red-50 text-red-600 sm:bg-transparent sm:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}
