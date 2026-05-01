/**
 * admin/components/SeriesRow.tsx
 * A single row in the series table.
 */

import { useRef } from 'react'
import { Pencil, Trash2, Tv, Images, Upload, History } from 'lucide-react'
import type { AdminSeries } from '../api'

function resolveThumb(url: string): string {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('/uploads/')) return url
  return `https://image.tmdb.org/t/p/w300${url}`
}

function getTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

interface SeriesRowProps {
  series: AdminSeries
  onEdit: (series: AdminSeries) => void
  onDelete: (series: AdminSeries) => void
  onBackdrops: (series: AdminSeries) => void
  onUpload: (series: AdminSeries, file: File) => void
}

export function SeriesRow({ series, onEdit, onDelete, onBackdrops, onUpload }: SeriesRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const today = getTodayStr()
  const pastDates = (series.used_dates ?? []).filter((d) => d <= today)
  const upcomingDates = (series.used_dates ?? []).filter((d) => d > today)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(series, file)
    e.target.value = ''
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Thumbnail */}
      <td className="px-3 py-3 w-20">
        {series.image_url ? (
          <img
            src={resolveThumb(series.image_url)}
            alt={series.title}
            className="w-16 h-10 object-cover rounded-md border border-gray-200"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-16 h-10 bg-gray-100 rounded-md flex items-center justify-center">
            <Tv size={14} className="text-gray-400" />
          </div>
        )}
      </td>

      {/* Title */}
      <td className="px-3 py-3 text-sm font-medium text-gray-900">
        <div className="flex flex-col gap-0.5">
          <span className="truncate max-w-[180px]">{series.title}</span>
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
      <td className="px-3 py-3 text-sm text-gray-600 tabular-nums hidden sm:table-cell">{series.year}</td>

      {/* Creator */}
      <td className="px-3 py-3 text-sm text-gray-600 hidden md:table-cell">
        <span className="truncate max-w-[140px] block">{series.creator}</span>
      </td>

      {/* Status */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <div className="flex flex-col gap-1">
          <span className={[
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            series.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
          ].join(' ')}>
            {series.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className="text-xs text-amber-500">
            {'★'.repeat(series.fame_level ?? 3)}{'☆'.repeat(5 - (series.fame_level ?? 3))}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button onClick={() => fileInputRef.current?.click()} title="Uploader une image" className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
            <Upload size={14} />
          </button>
          <button onClick={() => onBackdrops(series)} title="Backdrops TMDB" className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
            <Images size={14} />
          </button>
          <button onClick={() => onEdit(series)} title="Modifier" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(series)} title="Supprimer" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}
