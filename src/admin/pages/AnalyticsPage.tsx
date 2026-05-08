import { useEffect, useState, useCallback } from 'react'
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import { AdminLayout } from '../components/AdminLayout'
import { SegmentedToggle } from '../components/SegmentedToggle'
import {
  getAnalyticsOverviewByMedia,
  getAnalyticsDaily,
  getAnalyticsChallenges,
  getWrongGuesses,
  getReturningPlayersByMedia,
  getHourlyDistribution,
  getAttemptsDistribution,
  getHintsDistribution,
  type AnalyticsOverview,
  type DailyAnalytics,
  type ChallengeAnalytics,
  type WrongGuess,
  type ReturningPlayer,
  type HourlyData,
} from '../api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

function subtractDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d)
}

function Stars({ level }: { level: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(Math.min(level, 5))}
      <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - level))}</span>
    </span>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <span className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {msg}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

// Section 3 — Timeline SVG bar chart
function TimelineChart({ data }: { data: DailyAnalytics[] }) {
  if (data.length === 0) return <p className="text-sm text-gray-400 py-4">Aucune donnée.</p>

  const H = 120
  const maxSessions = Math.max(...data.map((d) => d.sessions_started), 1)
  const maxWinRate = 100
  const barW = 100 / data.length
  const showEvery = Math.max(1, Math.floor(data.length / 6))

  return (
    <div>
      <div className="flex gap-4 text-sm text-gray-500 mb-2">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" />Parties</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />Taux victoire %</span>
      </div>
      <svg width="100%" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 140 }}>
        {data.map((d, i) => {
          const sessH = (d.sessions_started / maxSessions) * H
          const winH = (d.win_rate / maxWinRate) * H
          const x = i * barW
          const bw = barW * 0.4
          return (
            <g key={d.date}>
              <rect x={x} y={H - sessH} width={bw} height={sessH} fill="#6366f1">
                <title>{d.date}: {d.sessions_started} parties</title>
              </rect>
              <rect x={x + bw + barW * 0.05} y={H - winH} width={bw} height={winH} fill="#10b981">
                <title>{d.date}: {d.win_rate}% victoires</title>
              </rect>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 grid text-[11px] text-gray-400" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d, i) => (
          <span key={d.date} className="text-center leading-none min-h-[14px]">
            {i % showEvery === 0 ? d.date.slice(5) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

// Section 4 & 5 — Horizontal bar chart
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 text-gray-600 text-sm shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className="h-4 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-gray-700 font-medium text-sm">{value}</span>
    </div>
  )
}

// Section 6 — Hourly SVG vertical bars
function HourlyChart({ data }: { data: HourlyData[] }) {
  if (data.length === 0) return <p className="text-sm text-gray-400 py-4">Aucune donnée.</p>

  const H = 80
  const labelH = 16
  const totalH = H + labelH
  const all24: HourlyData[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    sessions: data.find((d) => d.hour === h)?.sessions ?? 0,
  }))
  const maxSessions = Math.max(...all24.map((d) => d.sessions), 1)
  const maxHour = all24.reduce((best, d) => (d.sessions > best.sessions ? d : best), all24[0])
  const barW = 100 / 24

  return (
    <svg width="100%" viewBox={`0 0 100 ${totalH}`} preserveAspectRatio="none" className="w-full" style={{ height: 120 }}>
      {all24.map((d) => {
        const bh = (d.sessions / maxSessions) * H
        const x = d.hour * barW
        const fill = d.hour === maxHour.hour ? '#f97316' : '#6366f1'
        return (
          <g key={d.hour}>
            <rect x={x + barW * 0.1} y={H - bh} width={barW * 0.8} height={bh} fill={fill}>
              <title>{d.hour}h: {d.sessions} parties</title>
            </rect>
            {d.hour % 4 === 0 && (
              <text x={x + barW / 2} y={totalH - 2} fontSize="3.5" fill="#9ca3af" textAnchor="middle">
                {d.hour}h
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// Section 7 — Wrong guesses mini modal
function WrongGuessesPanel({
  item,
  onClose,
}: {
  item: ChallengeAnalytics
  onClose: () => void
}) {
  const [guesses, setGuesses] = useState<WrongGuess[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getWrongGuesses(item.challenge_id, 5)
      .then(setGuesses)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur'))
  }, [item.challenge_id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-xl w-80 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 text-sm">{item.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Top 5 mauvaises réponses</p>
        {!guesses && !error && <Spinner />}
        {error && <ErrorMsg msg={error} />}
        {guesses && guesses.length === 0 && <p className="text-sm text-gray-400">Aucune mauvaise réponse enregistrée.</p>}
        {guesses && guesses.length > 0 && (
          <ol className="space-y-1.5">
            {guesses.map((g, i) => (
              <li key={g.guess} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-4 text-sm">{i + 1}.</span>
                <span className="flex-1 text-gray-800">{g.guess}</span>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{g.count}×</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Period = '7' | '30' | '90' | 'all' | 'custom'
type AnalyticsSort = 'win_rate' | 'sessions' | 'avg_hints'
type MediaTab = 'film' | 'series' | 'wiki'

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [overviewErr, setOverviewErr] = useState<string | null>(null)

  const [period, setPeriod] = useState<Period>('30')
  const [customFrom, setCustomFrom] = useState(subtractDays(30))
  const [customTo, setCustomTo] = useState(todayISO())
  const [daily, setDaily] = useState<DailyAnalytics[]>([])
  const [dailyErr, setDailyErr] = useState<string | null>(null)
  const [dailyLoading, setDailyLoading] = useState(false)

  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [hints, setHints] = useState<Record<string, number>>({})
  const [hourly, setHourly] = useState<HourlyData[]>([])
  const [returning, setReturning] = useState<ReturningPlayer[]>([])
  const [distErr, setDistErr] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<MediaTab>('film')
  const [sort, setSort] = useState<AnalyticsSort>('win_rate')
  const [challenges, setChallenges] = useState<ChallengeAnalytics[]>([])
  const [challengesErr, setChallengesErr] = useState<string | null>(null)
  const [challengesLoading, setChallengesLoading] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeAnalytics | null>(null)

  // Load overview + distributions when media tab changes
  useEffect(() => {
    getAnalyticsOverviewByMedia(activeTab)
      .then(setOverview)
      .catch((e: unknown) => setOverviewErr(e instanceof Error ? e.message : 'Erreur'))

    Promise.all([
      getAttemptsDistribution(activeTab),
      getHintsDistribution(activeTab),
      getHourlyDistribution(activeTab),
      getReturningPlayersByMedia(undefined, activeTab),
    ])
      .then(([att, hin, hou, ret]) => {
        setAttempts(att)
        setHints(hin)
        setHourly(hou)
        setReturning(ret)
      })
      .catch((e: unknown) => setDistErr(e instanceof Error ? e.message : 'Erreur distributions'))
  }, [activeTab])

  // Load daily data when period changes
  const loadDaily = useCallback((p: Period) => {
    setDailyLoading(true)
    setDailyErr(null)
    const to = p === 'custom' ? customTo : todayISO()
    const from = p === 'all' ? '2000-01-01' : p === 'custom' ? customFrom : subtractDays(Number(p))
    getAnalyticsDaily(from, to, activeTab)
      .then(setDaily)
      .catch((e: unknown) => setDailyErr(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setDailyLoading(false))
  }, [activeTab, customFrom, customTo])

  useEffect(() => { loadDaily(period) }, [period, loadDaily])

  // Load challenge analytics for active media tab
  const loadChallenges = useCallback((mediaType: MediaTab, sortBy: AnalyticsSort) => {
    setChallengesLoading(true)
    setChallengesErr(null)
    getAnalyticsChallenges(mediaType, sortBy)
      .then(setChallenges)
      .catch((e: unknown) => setChallengesErr(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setChallengesLoading(false))
  }, [])

  useEffect(() => { loadChallenges(activeTab, sort) }, [activeTab, sort, loadChallenges])

  function handleSort(col: AnalyticsSort) {
    if (col === sort) return
    setSort(col)
  }

  const attMax = Math.max(...Object.values(attempts), 1)
  const hinMax = Math.max(...Object.values(hints), 1)

  const SortIcon = ({ col }: { col: AnalyticsSort }) =>
    sort === col
      ? <ChevronUp size={13} className="inline ml-0.5 text-indigo-600" />
      : <ChevronDown size={13} className="inline ml-0.5 text-gray-400" />

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* ── Section 1 : Type de jeu ──────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Type de jeu</h2>
          <SegmentedToggle
            value={activeTab}
            onChange={(v) => setActiveTab(v as MediaTab)}
            options={[
              { id: 'film', label: 'Films' },
              { id: 'series', label: 'Séries' },
              { id: 'wiki', label: 'Wikipedia' },
            ]}
          />
        </section>

        {/* ── Section 2 : KPIs ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Vue d'ensemble</h2>
          {overviewErr && <ErrorMsg msg={overviewErr} />}
          {!overview && !overviewErr && <Spinner />}
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Parties jouées" value={overview.total_sessions.toLocaleString('fr-FR')} />
              <KpiCard label="Joueurs uniques" value={overview.total_unique_players.toLocaleString('fr-FR')} />
              <KpiCard label="Taux de complétion" value={`${overview.completion_rate} %`} />
              <KpiCard label="Taux de victoire" value={`${overview.overall_win_rate} %`} />
              <KpiCard label="Moy. indices / partie" value={overview.avg_hints_per_session.toFixed(1)} />
              <KpiCard label="Durée moy. session" value={formatDuration(overview.avg_session_duration_seconds)} />
            </div>
          )}
        </section>

        {/* ── Section 3 : Sélecteur de période ────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Période</h2>
          <div className="flex gap-2 flex-wrap items-center">
            {(['7', '30', '90', 'all', 'custom'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  period === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {p === 'all' ? 'Tout' : p === 'custom' ? 'Dates' : `${p}j`}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <label className="text-xs text-gray-500">Du</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                max={customTo}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
              <label className="text-xs text-gray-500">au</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom} max={todayISO()}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
              <button onClick={() => loadDaily('custom')}
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Appliquer
              </button>
            </div>
          )}
        </section>

        {/* ── Section 4 : Timeline ─────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Activité quotidienne</h2>
          {dailyErr && <ErrorMsg msg={dailyErr} />}
          {dailyLoading && <Spinner />}
          {!dailyLoading && !dailyErr && <TimelineChart data={daily} />}
        </section>

        {/* ── Section 4 : Distribution tentatives ──────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Victoires par tentative</h2>
          {distErr && <ErrorMsg msg={distErr} />}
          {!distErr && Object.keys(attempts).length === 0 && <p className="text-sm text-gray-400">Aucune donnée.</p>}
          <div className="space-y-2">
            {(activeTab === 'wiki' ? [1, 2, 3] : [1, 2, 3, 4, 5]).map((n) => (
              <HBar
                key={n}
                label={`${n} tentative${n > 1 ? 's' : ''}`}
                value={attempts[String(n)] ?? 0}
                max={attMax}
                color="#6366f1"
              />
            ))}
          </div>
        </section>

        {/* ── Section 5 : Distribution indices ─────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Indices utilisés par partie</h2>
          {distErr && <ErrorMsg msg={distErr} />}
          {!distErr && Object.keys(hints).length === 0 && <p className="text-sm text-gray-400">Aucune donnée.</p>}
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <HBar
                key={n}
                label={`${n} indice${n > 1 ? 's' : ''}`}
                value={hints[String(n)] ?? 0}
                max={hinMax}
                color="#10b981"
              />
            ))}
          </div>
        </section>

        {/* ── Section 6 : Répartition horaire ──────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Répartition horaire (heure Paris)</h2>
          {distErr && <ErrorMsg msg={distErr} />}
          {!distErr && <HourlyChart data={hourly} />}
        </section>

        {/* ── Section 7 : Classement défis ─────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Classement des défis par difficulté</h2>
          </div>
          {challengesErr && <div className="p-4"><ErrorMsg msg={challengesErr} /></div>}
          {challengesLoading && <Spinner />}
          {!challengesLoading && !challengesErr && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">{activeTab === 'film' ? 'Film' : activeTab === 'series' ? 'Série' : 'Personnalité'}</th>
                    <th className="px-4 py-2.5 font-medium">Fame</th>
                    <th
                      className="px-4 py-2.5 font-medium cursor-pointer hover:text-indigo-600 select-none"
                      onClick={() => handleSort('sessions')}
                    >
                      Parties<SortIcon col="sessions" />
                    </th>
                    <th
                      className="px-4 py-2.5 font-medium cursor-pointer hover:text-indigo-600 select-none"
                      onClick={() => handleSort('win_rate')}
                    >
                      Victoires %<SortIcon col="win_rate" />
                    </th>
                    <th className="px-4 py-2.5 font-medium">Moy. tent.</th>
                    <th
                      className="px-4 py-2.5 font-medium cursor-pointer hover:text-indigo-600 select-none"
                      onClick={() => handleSort('avg_hints')}
                    >
                      Moy. indices<SortIcon col="avg_hints" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {challenges.map((item) => (
                    <tr
                      key={item.challenge_id}
                      className="hover:bg-indigo-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedChallenge(item)}
                    >
                      <td className="px-4 py-2.5 text-gray-500 text-sm whitespace-nowrap">{formatDate(item.challenge_date)}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">
                        {item.title}
                        <span className="ml-1 text-sm text-gray-400">{item.year}</span>
                      </td>
                      <td className="px-4 py-2.5"><Stars level={item.fame_level} /></td>
                      <td className="px-4 py-2.5 text-gray-700">{item.sessions}</td>
                      <td className="px-4 py-2.5">
                        <span className={[
                          'text-sm font-semibold px-1.5 py-0.5 rounded',
                          item.win_rate >= 60 ? 'bg-emerald-50 text-emerald-700' :
                          item.win_rate >= 40 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700',
                        ].join(' ')}>
                          {item.win_rate} %
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{item.avg_attempts.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-gray-600">{item.avg_hints.toFixed(1)}</td>
                    </tr>
                  ))}
                  {challenges.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">
                        {activeTab === 'film' ? 'Aucun film trouvé.' : activeTab === 'series' ? 'Aucune série trouvée.' : 'Aucune personnalité trouvée.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* ── Section 8 : Fidélité joueurs ──────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Fidélité des joueurs</h2>
          {distErr && <ErrorMsg msg={distErr} />}
          {!distErr && returning.length === 0 && <p className="text-sm text-gray-400">Aucune donnée.</p>}
          {returning.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Jours joués</th>
                  <th className="pb-2 font-medium text-right">Joueurs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {returning.map((r) => (
                  <tr key={r.days_played}>
                    <td className="py-2 text-gray-700">
                      {r.days_played === 1 ? '1 jour' : `${r.days_played} jours`}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-800">
                      {r.player_count.toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

      </div>

      {/* Wrong guesses modal */}
      {selectedChallenge && (
        <WrongGuessesPanel item={selectedChallenge} onClose={() => setSelectedChallenge(null)} />
      )}
    </AdminLayout>
  )
}
