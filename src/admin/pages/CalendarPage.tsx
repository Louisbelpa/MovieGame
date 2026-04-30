/**
 * admin/pages/CalendarPage.tsx
 * Planning des défis : liste des 30 prochains jours + option pour voir le passé.
 */

import { useEffect, useState, useCallback } from 'react'
import { ChevronUp, ChevronDown, Sparkles, Film, Tv } from 'lucide-react'
import {
  getChallenges,
  getFilms,
  getSeries,
  scheduleChallenge,
  updateChallenge,
  deleteChallenge,
  type AdminChallenge,
  type AdminFilm,
  type AdminSeries,
  type MediaRef,
} from '../api'
import { AdminLayout } from '../components/AdminLayout'
import { ChallengeRow } from '../components/ChallengeRow'

const FUTURE_DAYS = 30
const PAST_DAYS = 7

function getISODate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function buildDateRange(startOffset: number, endOffset: number): string[] {
  const count = endOffset - startOffset + 1
  return Array.from({ length: count }, (_, i) => getISODate(startOffset + i))
}

export function CalendarPage() {
  const [mediaType, setMediaType] = useState<'film' | 'series'>('film')
  const [challenges, setChallenges] = useState<AdminChallenge[]>([])
  const [films, setFilms] = useState<AdminFilm[]>([])
  const [seriesList, setSeriesList] = useState<AdminSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoSuccess, setAutoSuccess] = useState<string | null>(null)

  const from = showPast ? getISODate(-PAST_DAYS) : getISODate(0)
  const to = getISODate(FUTURE_DAYS - 1)

  const load = useCallback((rangeFrom: string, rangeTo: string, mt: 'film' | 'series') => {
    setLoading(true)
    Promise.all([getChallenges({ from: rangeFrom, to: rangeTo, mediaType: mt }), getFilms(), getSeries()])
      .then(([chs, fms, srs]) => {
        setChallenges(chs)
        setFilms(fms.filter((f) => f.is_active))
        setSeriesList(srs.filter((s) => s.is_active))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(from, to, mediaType)
  }, [load, from, to, mediaType])

  const byDate = Object.fromEntries(challenges.map((ch) => [ch.date, ch]))

  const dateRange = showPast
    ? buildDateRange(-PAST_DAYS, FUTURE_DAYS - 1)
    : buildDateRange(0, FUTURE_DAYS - 1)

  const todayStr = getISODate(0)
  const pastDates = dateRange.filter((d) => d < todayStr)
  const todayAndFuture = dateRange.filter((d) => d >= todayStr)
  const plannedCount = todayAndFuture.filter((d) => byDate[d]).length

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

  async function handleAutoSchedule() {
    setAutoLoading(true)
    setError(null)
    setAutoSuccess(null)
    let scheduled = 0
    try {
      const emptyDates = todayAndFuture.filter((d) => !byDate[d])
      if (emptyDates.length === 0) {
        setAutoSuccess('Tous les jours sont déjà planifiés !')
        return
      }

      // Pool is restricted to the active media type
      const usedIds = new Set(challenges.map((c) => (mediaType === 'series' ? c.series?.id : c.film?.id)).filter(Boolean) as number[])
      const pool: MediaRef[] = mediaType === 'series'
        ? seriesList.filter((s) => !usedIds.has(s.id)).map((s) => ({ seriesId: s.id }) as MediaRef)
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
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        <button
          onClick={() => setMediaType('film')}
          className={[
            'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
            mediaType === 'film' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          <Film size={14} /> Films
        </button>
        <button
          onClick={() => setMediaType('series')}
          className={[
            'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
            mediaType === 'series' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          <Tv size={14} /> Séries
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          Planning des{' '}
          <span className="font-medium text-gray-800">{FUTURE_DAYS} prochains jours</span>{' '}
          — {mediaType === 'series' ? 'séries' : 'films'}.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {plannedCount} / {FUTURE_DAYS} jours planifiés
          </span>
          <button
            type="button"
            onClick={handleAutoSchedule}
            disabled={autoLoading || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {autoLoading
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Sparkles size={13} />
            }
            Auto-planifier
          </button>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {showPast ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showPast ? 'Masquer le passé' : `${PAST_DAYS} jours passés`}
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
            {showPast && pastDates.length > 0 && (
              <>
                {pastDates.map((date) => (
                  <ChallengeRow
                    key={date}
                    date={date}
                    challenge={byDate[date] ?? null}
                    films={films}
                    seriesList={seriesList}
                    mediaType={mediaType}
                    onSchedule={handleSchedule}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
                <li className="flex items-center gap-3 px-4 py-2 bg-indigo-50">
                  <span className="flex-1 border-t border-indigo-200" />
                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Aujourd'hui</span>
                  <span className="flex-1 border-t border-indigo-200" />
                </li>
              </>
            )}
            {todayAndFuture.map((date) => (
              <ChallengeRow
                key={date}
                date={date}
                challenge={byDate[date] ?? null}
                films={films}
                seriesList={seriesList}
                onSchedule={handleSchedule}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  )
}
