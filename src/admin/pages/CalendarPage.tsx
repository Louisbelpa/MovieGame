/**
 * admin/pages/CalendarPage.tsx
 * Planning des défis : liste des 30 prochains jours.
 */

import { useEffect, useState, useCallback } from 'react'
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

const DAYS = 30

/** Return the next N ISO date strings starting from today */
function buildDateRange(days: number): string[] {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function CalendarPage() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([])
  const [films, setFilms] = useState<AdminFilm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dateRange = buildDateRange(DAYS)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getChallenges(DAYS), getFilms()])
      .then(([chs, fms]) => {
        setChallenges(chs)
        setFilms(fms.filter((f) => f.is_active))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** Map date → challenge for fast lookup */
  const byDate = Object.fromEntries(challenges.map((ch) => [ch.date, ch]))

  async function handleSchedule(date: string, filmId: number) {
    await scheduleChallenge(date, filmId)
    load()
  }

  async function handleUpdate(challengeId: number, filmId: number) {
    await updateChallenge(challengeId, filmId)
    load()
  }

  async function handleDelete(challengeId: number) {
    await deleteChallenge(challengeId)
    load()
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Planning des{' '}
          <span className="font-medium text-gray-800">{DAYS} prochains jours</span>.
          Cliquez sur <strong>Planifier</strong> pour associer un film à une date.
        </p>
        <span className="text-xs text-gray-400">
          {challenges.length} / {DAYS} jours planifiés
        </span>
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
            {dateRange.map((date) => (
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
