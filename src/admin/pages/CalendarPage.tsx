/**
 * admin/pages/CalendarPage.tsx
 * Planning des défis : liste des 30 prochains jours + option pour voir le passé.
 */

import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, Sparkles, Film, Tv, X, Landmark } from 'lucide-react'
import {
  getChallenges,
  getFilms,
  getSeries,
  getWikiPersons,
  scheduleChallenge,
  updateChallenge,
  deleteChallenge,
  updateFilm,
  updateSeries,
  checkAdminConfig,
  type AdminChallenge,
  type AdminFilm,
  type AdminSeries,
  type AdminWikiPerson,
  type MediaRef,
  type FilmPayload,
  type SeriesPayload,
} from '../api'
import { AdminLayout } from '../components/AdminLayout'
import { SegmentedToggle } from '../components/SegmentedToggle'
import { ChallengeRow } from '../components/ChallengeRow'
import { FilmForm } from '../components/FilmForm'
import { SeriesForm } from '../components/SeriesForm'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4 sm:my-8">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-4">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
      </div>
    </div>
  )
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentYearMonth(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function buildMonthDates(yearMonth: string): string[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) =>
    `${yearMonth}-${String(i + 1).padStart(2, '0')}`
  )
}

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function CalendarPage() {
  const [mediaType, setMediaType] = useState<'film' | 'series' | 'wiki'>('film')
  const [currentMonth, setCurrentMonth] = useState(getCurrentYearMonth)
  const [challenges, setChallenges] = useState<AdminChallenge[]>([])
  const [films, setFilms] = useState<AdminFilm[]>([])
  const [seriesList, setSeriesList] = useState<AdminSeries[]>([])
  const [wikiPersons, setWikiPersons] = useState<AdminWikiPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allowPast, setAllowPast] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoSuccess, setAutoSuccess] = useState<string | null>(null)
  const [editingFilm, setEditingFilm] = useState<AdminFilm | null>(null)
  const [editingSeries, setEditingSeries] = useState<AdminSeries | null>(null)

  const monthDates = buildMonthDates(currentMonth)
  const from = monthDates[0]
  const to = monthDates[monthDates.length - 1]
  const todayISO = getTodayISO()
  const isCurrentMonth = currentMonth === getCurrentYearMonth()

  useEffect(() => {
    checkAdminConfig().then((cfg) => {
      if (cfg.allowPastScheduling) setAllowPast(true)
    })
  }, [])

  const load = useCallback((rangeFrom: string, rangeTo: string, mt: 'film' | 'series' | 'wiki') => {
    setLoading(true)
    Promise.all([getChallenges({ from: rangeFrom, to: rangeTo, mediaType: mt }), getFilms(), getSeries(), getWikiPersons({ limit: 500 })])
      .then(([chs, fms, srs, wps]) => {
        setChallenges(chs)
        setFilms(fms.filter((f) => f.is_active))
        setSeriesList(srs.filter((s) => s.is_active))
        setWikiPersons(wps.data.filter((p) => p.is_active))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(from, to, mediaType)
  }, [load, from, to, mediaType])

  const byDate = Object.fromEntries(challenges.map((ch) => [ch.date, ch]))

  const futureDates = monthDates.filter((d) => d >= todayISO)
  const plannedCount = monthDates.filter((d) => byDate[d]).length

  async function handleSchedule(date: string, ref: MediaRef) {
    await scheduleChallenge(date, ref)
    load(from, to, mediaType)
  }

  async function handleUpdate(challengeId: number, ref: MediaRef) {
    await updateChallenge(challengeId, ref)
    load(from, to, mediaType)
  }

  async function handleDelete(challengeId: number) {
    await deleteChallenge(challengeId)
    load(from, to, mediaType)
  }

  function handleEditMedia(media: AdminFilm | AdminSeries | AdminWikiPerson, type: 'film' | 'series' | 'wiki') {
    if (type === 'wiki') {
      window.location.href = '/admin/wiki'
      return
    }
    if (type === 'series') setEditingSeries(media as AdminSeries)
    else setEditingFilm(media as AdminFilm)
  }

  async function handleSaveFilm(payload: FilmPayload) {
    if (!editingFilm) return
    await updateFilm(editingFilm.id, payload)
    setEditingFilm(null)
    load(from, to, mediaType)
  }

  async function handleSaveSeries(payload: SeriesPayload) {
    if (!editingSeries) return
    await updateSeries(editingSeries.id, payload)
    setEditingSeries(null)
    load(from, to, mediaType)
  }

  async function handleAutoSchedule() {
    setAutoLoading(true)
    setError(null)
    setAutoSuccess(null)
    let scheduled = 0
    try {
      const emptyDates = futureDates.filter((d) => !byDate[d])
      if (emptyDates.length === 0) {
        setAutoSuccess('Tous les jours sont déjà planifiés !')
        return
      }

      // Pool is restricted to the active media type
      const usedIds = new Set(challenges.map((c) =>
        mediaType === 'series' ? c.series?.id : mediaType === 'wiki' ? c.wiki?.id : c.film?.id
      ).filter(Boolean) as number[])
      const pool: MediaRef[] = mediaType === 'series'
        ? seriesList.filter((s) => !usedIds.has(s.id)).map((s) => ({ seriesId: s.id }) as MediaRef)
        : mediaType === 'wiki'
          ? wikiPersons.filter((p) => !usedIds.has(p.id)).map((p) => ({ wikiPersonId: p.id }) as MediaRef)
          : films.filter((f) => !usedIds.has(f.id)).map((f) => ({ filmId: f.id }) as MediaRef)
      pool.sort(() => Math.random() - 0.5)

      if (pool.length === 0) {
        setError('Aucun contenu disponible non encore planifié.')
        return
      }

      const toSchedule = emptyDates.slice(0, pool.length)
      const results = await Promise.allSettled(
        toSchedule.map((date, i) => scheduleChallenge(date, pool[i]))
      )
      scheduled = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        setError(`${failed} défi${failed > 1 ? 's' : ''} n'ont pas pu être planifiés (conflit de date ?).`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur auto-planification')
    } finally {
      load(from, to, mediaType)
      if (scheduled > 0) {
        setAutoSuccess(`${scheduled} défi${scheduled > 1 ? 's' : ''} planifié${scheduled > 1 ? 's' : ''} automatiquement.`)
        setTimeout(() => setAutoSuccess(null), 4000)
      }
      setAutoLoading(false)
    }
  }

  return (
    <AdminLayout>
      {/* Media type tabs */}
      <SegmentedToggle
        value={mediaType}
        onChange={setMediaType}
        className="mb-4 w-full sm:w-fit"
        options={[
          { id: 'film', label: 'Films', icon: <Film size={14} /> },
          { id: 'series', label: 'Séries', icon: <Tv size={14} /> },
          { id: 'wiki', label: 'Wikipedia', icon: <Landmark size={14} /> },
        ]}
      />

      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
            className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Mois précédent"
          >
            <ChevronDown size={15} className="rotate-90" />
          </button>
          <span className="text-base font-semibold text-gray-800 capitalize min-w-[160px] text-center">
            {formatMonthLabel(currentMonth)}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Mois suivant"
          >
            <ChevronDown size={15} className="-rotate-90" />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setCurrentMonth(getCurrentYearMonth())}
              className="ml-1 px-2 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              Aujourd'hui
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-xs text-gray-400">
            {plannedCount} / {monthDates.length} jours planifiés
          </span>
          <button
            type="button"
            onClick={handleAutoSchedule}
            disabled={autoLoading || loading || futureDates.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {autoLoading
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Sparkles size={13} />
            }
            Auto-planifier
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {autoSuccess && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          {autoSuccess}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {monthDates.map((date, i) => (
              <>
                {isCurrentMonth && date === todayISO && i > 0 && (
                  <li key={`divider-${date}`} className="flex items-center gap-3 px-4 py-2 bg-indigo-50">
                    <span className="flex-1 border-t border-indigo-200" />
                    <span className="text-sm font-semibold text-indigo-500 uppercase tracking-wider">Aujourd'hui</span>
                    <span className="flex-1 border-t border-indigo-200" />
                  </li>
                )}
                <ChallengeRow
                  key={date}
                  date={date}
                  challenge={byDate[date] ?? null}
                  films={films}
                  seriesList={seriesList}
                  wikiPersons={wikiPersons}
                  mediaType={mediaType}
                  onSchedule={handleSchedule}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onEditMedia={handleEditMedia}
                  allowPast={allowPast}
                />
              </>
            ))}
          </ul>
        )}
      </div>
      {editingFilm && (
        <Modal title={`Modifier — ${editingFilm.title}`} onClose={() => setEditingFilm(null)}>
          <FilmForm
            initial={editingFilm}
            onSubmit={handleSaveFilm}
            onCancel={() => setEditingFilm(null)}
          />
        </Modal>
      )}

      {editingSeries && (
        <Modal title={`Modifier — ${editingSeries.title}`} onClose={() => setEditingSeries(null)}>
          <SeriesForm
            initial={editingSeries}
            onSubmit={handleSaveSeries}
            onCancel={() => setEditingSeries(null)}
          />
        </Modal>
      )}
    </AdminLayout>
  )
}
