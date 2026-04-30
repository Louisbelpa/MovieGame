/**
 * admin/pages/DashboardPage.tsx
 * Main dashboard: today's challenge, upcoming schedule, quick stats.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, Calendar, TrendingUp, Clapperboard, Users, AlertCircle, Tv } from 'lucide-react'
import { getDashboard, type AdminDashboard, type AdminChallenge } from '../api'
import { AdminLayout } from '../components/AdminLayout'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      {loading && (
        <div className="flex items-center justify-center h-40">
          <span className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Film size={20} className="text-indigo-500" />}
              label="Films actifs"
              value={data.stats.total_films}
            />
            <StatCard
              icon={<AlertCircle size={20} className="text-amber-500" />}
              label="Films non planifiés"
              value={data.stats.unused_films}
            />
            <StatCard
              icon={<Calendar size={20} className="text-emerald-500" />}
              label="Défis planifiés"
              value={data.stats.total_challenges}
            />
            <StatCard
              icon={<AlertCircle size={20} className="text-red-400" />}
              label="Jours vides (30j)"
              value={data.stats.unscheduled_next_30}
            />
            <StatCard
              icon={<Users size={20} className="text-blue-500" />}
              label="Parties aujourd'hui"
              value={data.stats.today_games}
            />
            <StatCard
              icon={<TrendingUp size={20} className="text-teal-500" />}
              label="Taux de réussite global"
              value={`${data.stats.success_rate} %`}
            />
          </div>

          {/* Today's challenge */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Défi du jour
            </h2>
            {data.today_challenge ? (
              <ChallengeCard challenge={data.today_challenge} large />
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                Aucun défi planifié pour aujourd'hui.
              </div>
            )}
          </section>

          {/* Upcoming challenges */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              7 prochains défis
            </h2>
            {data.upcoming_challenges.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun défi planifié.</p>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {data.upcoming_challenges.slice(0, 7).map((ch) => (
                  <ChallengeCard key={ch.id} challenge={ch} />
                ))}
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/films')}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Film size={16} />
              Gérer les films
            </button>
            <button
              onClick={() => navigate('/admin/calendar')}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar size={16} />
              Gérer le planning
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

// ─── Challenge card ───────────────────────────────────────────────────────────

function ChallengeCard({ challenge, large }: { challenge: AdminChallenge; large?: boolean }) {
  const media = challenge.film ?? challenge.series
  const isSeries = challenge.mediaType === 'series'
  const subtitle = isSeries
    ? `${media?.year} · ${(challenge.series as { creator?: string })?.creator ?? ''}`
    : `${media?.year} · ${(challenge.film as { director?: string })?.director ?? ''}`

  if (large) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 items-center">
        {media?.image_url ? (
          <img src={media.image_url} alt={media.title} className="w-20 h-14 object-cover rounded-lg flex-shrink-0 border border-gray-100" />
        ) : (
          <div className="w-20 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {isSeries ? <Tv size={22} className="text-gray-400" /> : <Clapperboard size={22} className="text-gray-400" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{media?.title}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(challenge.date)}</p>
        </div>
        {isSeries && (
          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Série</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {media?.image_url ? (
        <img src={media.image_url} alt={media.title} className="w-10 h-7 object-cover rounded border border-gray-100 flex-shrink-0" />
      ) : (
        <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
          {isSeries ? <Tv size={13} className="text-gray-400" /> : <Clapperboard size={13} className="text-gray-400" />}
        </div>
      )}
      <span className="text-xs text-gray-400 w-28 flex-shrink-0">{formatDate(challenge.date)}</span>
      <span className="text-sm text-gray-800 font-medium truncate">{media?.title}</span>
      <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{media?.year}</span>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
