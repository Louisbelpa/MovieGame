/**
 * admin/components/FilmRow.tsx
 * A single row in the films table.
 */

import { Pencil, Trash2, Clapperboard, Images } from 'lucide-react'
import type { AdminFilm } from '../api'

interface FilmRowProps {
  film: AdminFilm
  onEdit: (film: AdminFilm) => void
  onDelete: (film: AdminFilm) => void
  onBackdrops: (film: AdminFilm) => void
}

export function FilmRow({ film, onEdit, onDelete, onBackdrops }: FilmRowProps) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Thumbnail */}
      <td className="px-4 py-3 w-14">
        {film.image_url ? (
          <img
            src={film.image_url}
            alt={film.title}
            className="w-10 h-7 object-cover rounded border border-gray-200"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center">
            <Clapperboard size={13} className="text-gray-400" />
          </div>
        )}
      </td>

      {/* Title */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">
        {film.title}
      </td>

      {/* Year */}
      <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{film.year}</td>

      {/* Director */}
      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">
        {film.director}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={[
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            film.is_active
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-500',
          ].join(' ')}
        >
          {film.is_active ? 'Actif' : 'Inactif'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onBackdrops(film)}
            title="Backdrops TMDB"
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Images size={15} />
          </button>
          <button
            onClick={() => onEdit(film)}
            title="Modifier"
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(film)}
            title="Supprimer"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}
