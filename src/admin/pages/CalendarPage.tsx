/**
 * admin/pages/CalendarPage.tsx
 * Planning des défis : liste des 30 prochains jours + option pour voir le passé.
 */

import { useEffect, useState, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import {
  getChallenges,
  getFilms,
  scheduleChallenge,
  updateChallenge,
  deleteChallenge,
  type AdminChallenge,
  type AdminFilm,
} from '../api'
import { AdminLayout } from '../components/AdminLayout'
import { ChallengeRow } from '../components/ChallengeRow'

const FUTURE_DAYS = 30
const PAST_DAYS = 30

function getISODate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

/** Return ISO date strings from startOffset to endOffset (inclusive), relative to today */
function buildDateRange(startOffset: number, endOffset: number): string[] {
  const count = endOffset - startOffset + 1
  return Array.from({ length: count }, (_, i) => getISODate(startOffset + i))
}

export function CalendarPage() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([])
  const [films, setFilms] = useState<AdminFilm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const from = showPast ? getISODate(-PAST_DAYS) : getISODate(0)
  const to = getISODate(FUTURE_DAYS - 1)

  const load = useCallback((rangeFrom: string, rangeTo: string) => {
    setLoading(true)
    Promise.all([getChallenges({ from: rangeFrom, to: rangeTo }), getFilms()])
      .then(([chs, fms]) => {
        setChallenges(chs)
        setFilms(fms.filter((f) => f.is_active))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(from, to)
  }, [load, from, to])

  const byDate = Object.fromEntries(challenges.map((ch) => [ch.date, ch]))

  const dateRange = showPast
    ? buildDateRange(-PAST_DAYS, FUTURE_DAYS - 1)
    : buildDateRange(0, FUTURE_DAYS - 1)

  const todayStr = getISODate(0)
  const pastDates = dateRange.filter((d) => d < todayStr)
  const todayAndFuture = dateRange.filter((d) => d >= todayStr)
  const plannedCount = todayAndFuture.filter((d) => byDate[d]).length

  async function handleSchedule(date: string, filmId: number) {
    await scheduleChallenge(date, filmId)
    load(from, to)
  }

  async function handleUpdate(challengeId: number, filmId: number) {
    await updateChallenge(challengeId, filmId)
    load(from, to)
  }

  async function handleDelete(challengeId: number) {
    await deleteChallenge(challengeId)
    load(from, to)
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          Planning des{' '}
          <span className="font-medium text-gray-800">{FUTURE_DAYS} prochains jours</span>.
          Cliquez sur <strong>Planifier</strong> pour associer un film à une date.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {plannedCount} / {FUTURE_DAYS} jours planifiés
          </span>
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
