import { useRef } from 'react'
import { Pencil, Trash2, Clapperboard, Images, Upload, History, Eye } from 'lucide-react'
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
  selected?: boolean
  onSelect?: (id: number, checked: boolean) => void
  onEdit: (film: AdminFilm) => void
  onDelete: (film: AdminFilm) => void
  onBackdrops: (film: AdminFilm) => void
  onUpload: (film: AdminFilm, file: File) => void
  onPreview: (film: AdminFilm) => void
}

export function FilmRow({ film, selected, onSelect, onEdit, onDelete, onBackdrops, onUpload, onPreview }: FilmRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const today = getTodayStr()
  const pastDates = (film.used_dates ?? []).filter((d) => d <= today)
  const upcomingDates = (film.used_dates ?? []).filter((d) => d > today)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(film, file)
    e.target.value = ''
  }

  const Badges = () => (
    <div className="flex flex-wrap gap-1">
      {pastDates.length > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-700">
          <History size={9} />Joué {pastDates.length}×
        </span>
      )}
      {upcomingDates.length > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
          Planifié
        </span>
      )}
    </div>
  )

  const ActionButtons = ({ compact }: { compact?: boolean }) => (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <button onClick={() => onPreview(film)} title="Aperçu du défi"
        className={`${compact ? 'p-2' : 'p-1.5'} bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors`}>
        <Eye size={14} />
      </button>
      <button onClick={() => fileInputRef.current?.click()} title="Uploader une image"
        className={`${compact ? 'p-2' : 'p-1.5'} bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors`}>
        <Upload size={14} />
      </button>
      <button onClick={() => onBackdrops(film)} title="Backdrops TMDB"
        className={`${compact ? 'p-2' : 'p-1.5'} bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors`}>
        <Images size={14} />
      </button>
      <button onClick={() => onEdit(film)} title="Modifier"
        className={`${compact ? 'p-2' : 'p-1.5'} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors`}>
        <Pencil size={14} />
      </button>
      <button onClick={() => onDelete(film)} title="Supprimer"
        className={`${compact ? 'p-2' : 'p-1.5'} bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors`}>
        <Trash2 size={14} />
      </button>
    </>
  )

  return (
    <>
      {/* Mobile card */}
      <tr className="sm:hidden border-b border-gray-100 last:border-0">
        <td className="px-3 py-3" colSpan={10}>
          <div className="flex items-center gap-3">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected ?? false}
                onChange={(e) => onSelect(film.id, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 shrink-0"
              />
            )}
            <div className="shrink-0">
              {film.image_url ? (
                <img src={resolveThumb(film.image_url)} alt={film.title}
                  className="w-14 h-10 object-cover rounded-md border border-gray-200"
                  onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <div className="w-14 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                  <Clapperboard size={14} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">{film.title}</div>
              {film.year && <div className="text-xs text-gray-500 mt-0.5">{film.year}</div>}
              <div className="mt-1"><Badges /></div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ActionButtons compact />
            </div>
          </div>
        </td>
      </tr>

      {/* Desktop row */}
      <tr className={`hidden sm:table-row hover:bg-gray-50 transition-colors group ${selected ? 'bg-indigo-50' : ''}`}>
        {onSelect && (
          <td className="px-3 py-3 w-8">
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={(e) => onSelect(film.id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 accent-indigo-600"
            />
          </td>
        )}
        <td className="px-3 py-3 w-20">
          {film.image_url ? (
            <img src={resolveThumb(film.image_url)} alt={film.title}
              className="w-16 h-10 object-cover rounded-md border border-gray-200"
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div className="w-16 h-10 bg-gray-100 rounded-md flex items-center justify-center">
              <Clapperboard size={14} className="text-gray-400" />
            </div>
          )}
        </td>
        <td className="px-3 py-3 text-sm font-medium text-gray-900">
          <div className="flex flex-col gap-0.5">
            <span className="truncate max-w-[180px]">{film.title}</span>
            <Badges />
          </div>
        </td>
        <td className="px-3 py-3 text-sm text-gray-600 tabular-nums hidden sm:table-cell">{film.year}</td>
        <td className="px-3 py-3 text-sm text-gray-600 hidden md:table-cell">
          <span className="truncate max-w-[140px] block">{film.director}</span>
        </td>
        <td className="px-3 py-3 hidden lg:table-cell">
          <div className="flex flex-col gap-1">
            <span className={['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              film.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'].join(' ')}>
              {film.is_active ? 'Actif' : 'Inactif'}
            </span>
            <span className="text-xs text-amber-500">
              {'★'.repeat(film.fame_level ?? 3)}{'☆'.repeat(5 - (film.fame_level ?? 3))}
            </span>
          </div>
        </td>
        <td className="px-3 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <ActionButtons />
          </div>
        </td>
      </tr>
    </>
  )
}
