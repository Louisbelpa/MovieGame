import { useEffect, useState, useMemo } from 'react'
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

/** Date du planning (`YYYY-MM-DD`) sans décalage fuseau : même jour qu’en base */
function formatChallengeDate(iso: string): string {
  const day = iso.includes('T') ? iso.split('T')[0]! : iso
  const [y, m, d] = day.split('-').map((x) => parseInt(x, 10))
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

function challengeDateYmd(iso: string): string {
  return iso.includes('T') ? iso.split('T')[0]! : iso
}

function subtractDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d)
}

type Period = '1' | '7' | '30' | '90' | 'all' | 'custom'

/** Même plage que le graphique « Activité quotidienne » (dates défi, calendrier Paris). */
function analyticsDateRange(period: Period, customFrom: string, customTo: string): { from: string; to: string } {
  const to = period === 'custom' ? customTo : todayISO()
  if (period === 'all') return { from: '2000-01-01', to }
  if (period === 'custom') return { from: customFrom, to: customTo }
  if (period === '1') return { from: todayISO(), to: todayISO() }
  return { from: subtractDays(Number(period)), to }
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

// Section 6 — Barres par heure (HTML + grille : libellés lisibles, pas d’écrasement SVG)
function HourlyChart({ data }: { data: HourlyData[] }) {
  if (data.length === 0) return <p className="text-sm text-gray-400 py-4">Aucune donnée.</p>

  const all24: HourlyData[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    sessions: data.find((d) => d.hour === h)?.sessions ?? 0,
  }))
  const maxSessions = Math.max(...all24.map((d) => d.sessions), 1)
  const maxHour = all24.reduce((best, d) => (d.sessions > best.sessions ? d : best), all24[0])
  const totalHr = all24.reduce((s, d) => s + d.sessions, 0)

  return (
    <div className="pt-1">
      {totalHr > 0 ? (
        <p className="text-xs text-gray-500 mb-2">
          Pic à l’heure {maxHour.hour}h ({maxHour.sessions} parties sur {totalHr.toLocaleString('fr-FR')}).
        </p>
      ) : null}
      <div className="flex h-32 items-end gap-px sm:gap-0.5">
        {all24.map((d) => {
          const pct = maxSessions > 0 ? (d.sessions / maxSessions) * 100 : 0
          const hPx = Math.max((pct / 100) * 128, d.sessions > 0 ? 3 : 0)
          const orange = d.hour === maxHour.hour && maxSessions > 0
          return (
            <div
              key={d.hour}
              className="min-w-0 flex-1 flex flex-col justify-end"
              title={`${d.hour}h — ${d.sessions} partie${d.sessions > 1 ? 's' : ''}`}
            >
              <div
                className={`w-full rounded-t transition-colors ${orange ? 'bg-orange-500' : 'bg-indigo-500'}`}
                style={{ height: `${hPx}px` }}
              />
            </div>
          )
        })}
      </div>
      <div
        className="mt-2 grid text-[10px] sm:text-xs text-gray-700"
        style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
      >
        {all24.map((d) => (
          <div key={d.hour} className="text-center leading-tight tabular-nums px-0 min-w-0">
            {d.hour % 4 === 0 ? <span className="inline-block whitespace-nowrap">{d.hour}h</span> : null}
          </div>
        ))}
      </div>
    </div>
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

type AnalyticsSort = 'challenge_date' | 'win_rate' | 'sessions' | 'avg_hints'
type MediaTab = 'film' | 'series' | 'wiki'

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [overviewErr, setOverviewErr] = useState<string | null>(null)

  const [period, setPeriod] = useState<Period>('1')
  const [customFrom, setCustomFrom] = useState(subtractDays(30))
  const [customTo, setCustomTo] = useState(todayISO())
  const [daily, setDaily] = useState<DailyAnalytics[]>([])
  const [dailyErr, setDailyErr] = useState<string | null>(null)

  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [hints, setHints] = useState<Record<string, number>>({})
  const [hourly, setHourly] = useState<HourlyData[]>([])
  const [returning, setReturning] = useState<ReturningPlayer[]>([])
  const [distErr, setDistErr] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<MediaTab>('film')
  const [sort, setSort] = useState<AnalyticsSort>('challenge_date')
  const [challenges, setChallenges] = useState<ChallengeAnalytics[]>([])
  const [challengesErr, setChallengesErr] = useState<string | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeAnalytics | null>(null)

  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [customApplyNonce, setCustomApplyNonce] = useState(0)

  const dateRange = useMemo(
    () => analyticsDateRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  )

  useEffect(() => {
    const { from, to } = dateRange
    setOverview(null)
    setDaily([])
    setAttempts({})
    setHints({})
    setHourly([])
    setReturning([])
    setChallenges([])
    setOverviewErr(null)
    setDailyErr(null)
    setDistErr(null)
    setChallengesErr(null)
    setAnalyticsLoading(true)

    const fail =
      (setErr: (msg: string | null) => void) => (e: unknown) =>
        setErr(e instanceof Error ? e.message : 'Erreur')

    void Promise.all([
      getAnalyticsOverviewByMedia(activeTab, from, to)
        .then(setOverview)
        .catch((e) => {
          fail(setOverviewErr)(e)
          setOverview(null)
        }),
      getAnalyticsDaily(from, to, activeTab)
        .then(setDaily)
        .catch(fail(setDailyErr)),
      getAttemptsDistribution(activeTab, from, to)
        .then(setAttempts)
        .catch(fail(setDistErr)),
      getHintsDistribution(activeTab, from, to)
        .then(setHints)
        .catch(fail(setDistErr)),
      getHourlyDistribution(activeTab, from, to)
        .then(setHourly)
        .catch(fail(setDistErr)),
      getReturningPlayersByMedia(from, to, activeTab)
        .then(setReturning)
        .catch(fail(setDistErr)),
      getAnalyticsChallenges(activeTab, sort, from, to)
        .then(setChallenges)
        .catch(fail(setChallengesErr)),
    ]).finally(() => setAnalyticsLoading(false))
  }, [activeTab, sort, dateRange, customApplyNonce])

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

  const parisTodayYmd = todayISO()

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
              { id: 'wiki', label: 'Personnalités' },
            ]}
          />
        </section>

        {/* ── Section 2 : Période (filtre toute la page) ───────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Période</h2>
          <p className="text-xs text-gray-500 mb-3 max-w-3xl">
            Toutes les statistiques ci-dessous portent sur les parties liées à un <strong>défi dont la date planifiée</strong> (calendrier
            Paris) est comprise entre les deux bornes — y compris la vue d’ensemble, les graphiques et le classement.
          </p>
          <div className="flex gap-2 flex-wrap items-center">
            {(['1', '7', '30', '90', 'all', 'custom'] as Period[]).map((p) => (
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
              <button
                type="button"
                onClick={() => setCustomApplyNonce((n) => n + 1)}
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Appliquer
              </button>
            </div>
          )}
        </section>

        {/* ── Section 3 : KPIs ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Vue d'ensemble</h2>
          <p className="text-xs text-gray-500 mb-3 max-w-3xl">
            Agrégats sur la <strong>période</strong> et le <strong>type de jeu</strong> sélectionnés (défis dont la date planifiée tombe dans
            l’intervalle). <strong>Parties jouées</strong> = parties terminées (gagné ou perdu). <strong>Sessions non terminées</strong> =
            ouvertures sans fin de partie enregistrée (en cours ou abandonnées). <strong>Ouvertures (total)</strong> = somme des deux.
          </p>
          {overviewErr && <ErrorMsg msg={overviewErr} />}
          {analyticsLoading && !overview && !overviewErr && <Spinner />}
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Parties jouées" value={overview.completed_sessions.toLocaleString('fr-FR')} />
              <KpiCard label="Sessions non terminées" value={overview.incomplete_sessions.toLocaleString('fr-FR')} />
              <KpiCard label="Ouvertures (total)" value={overview.total_sessions.toLocaleString('fr-FR')} />
              <KpiCard label="Joueurs uniques" value={overview.total_unique_players.toLocaleString('fr-FR')} />
              <KpiCard label="Taux de complétion" value={`${overview.completion_rate} %`} />
              <KpiCard label="Taux de victoire" value={`${overview.overall_win_rate} %`} />
              <KpiCard label="Moy. indices / partie" value={(overview.avg_hints_per_session ?? 0).toFixed(1)} />
              <KpiCard label="Durée moy. partie" value={formatDuration(overview.avg_session_duration_seconds ?? 0)} />
            </div>
          )}
        </section>

        {/* ── Section 4 : Timeline ─────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Activité quotidienne</h2>
          <p className="text-xs text-gray-500 mb-3">Une ligne par <strong>jour de défi</strong> (date planifiée) dans la période.</p>
          {dailyErr && <ErrorMsg msg={dailyErr} />}
          {analyticsLoading && <Spinner />}
          {!analyticsLoading && !dailyErr && <TimelineChart data={daily} />}
        </section>

        {/* ── Section 4 : Distribution tentatives ──────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Victoires par tentative</h2>
          {distErr && <ErrorMsg msg={distErr} />}
          {analyticsLoading && <Spinner />}
          {!analyticsLoading && !distErr && Object.keys(attempts).length === 0 && <p className="text-sm text-gray-400">Aucune donnée.</p>}
          {!analyticsLoading && (
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
          )}
        </section>

        {/* ── Section 5 : Distribution indices ─────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Indices utilisés par partie</h2>
          {distErr && <ErrorMsg msg={distErr} />}
          {analyticsLoading && <Spinner />}
          {!analyticsLoading && !distErr && Object.keys(hints).length === 0 && <p className="text-sm text-gray-400">Aucune donnée.</p>}
          {!analyticsLoading && (
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
          )}
        </section>

        {/* ── Section 6 : Répartition horaire ──────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Répartition horaire (heure Paris)</h2>
          <p className="text-xs text-gray-500 mb-3">Heure de début de partie, sessions dont le défi est dans la période.</p>
          {distErr && <ErrorMsg msg={distErr} />}
          {analyticsLoading && <Spinner />}
          {!analyticsLoading && !distErr && <HourlyChart data={hourly} />}
        </section>

        {/* ── Section 7 : Classement défis ─────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Classement des défis par difficulté</h2>
            <p className="text-xs text-gray-500 mt-1">
              Même <strong>période</strong> et type de jeu que ci-dessus. La colonne <strong>Date du défi</strong> est le jour planifié
              (Paris). Tri par défaut du plus récent au plus ancien ; autres tris via les en-têtes. Sont listés les défis avec au moins
              une partie commencée ou le défi du jour dans la fenêtre sans session encore.
            </p>
          </div>
          {challengesErr && <div className="p-4"><ErrorMsg msg={challengesErr} /></div>}
          {analyticsLoading && <Spinner />}
          {!analyticsLoading && !challengesErr && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th
                      className="px-4 py-2.5 font-medium cursor-pointer hover:text-indigo-600 select-none"
                      onClick={() => handleSort('challenge_date')}
                    >
                      Date du défi<SortIcon col="challenge_date" />
                    </th>
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
                  {challenges.map((item) => {
                    const isToday = challengeDateYmd(item.challenge_date) === parisTodayYmd
                    return (
                    <tr
                      key={item.challenge_id}
                      className={[
                        'cursor-pointer transition-colors border-l-[3px]',
                        isToday
                          ? 'bg-amber-50 hover:bg-amber-100/80 border-l-amber-500 shadow-[inset_0_1px_0_0_rgba(253,230,138,0.9)]'
                          : 'hover:bg-indigo-50 border-l-transparent',
                      ].join(' ')}
                      onClick={() => setSelectedChallenge(item)}
                    >
                      <td className="px-4 py-2.5 text-gray-600 text-sm whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          {isToday ? (
                            <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950">
                              {'Aujourd\'hui'}
                            </span>
                          ) : null}
                          <span>{formatChallengeDate(item.challenge_date)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">
                        {item.title}
                        {item.media_type !== 'wiki' && item.year > 0 ? (
                          <span className="ml-1 text-sm text-gray-400">{item.year}</span>
                        ) : null}
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
                    )
                  })}
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
          <p className="text-xs text-gray-500 mb-3">Nombre de <strong>jours de défi distincts</strong> joués dans la période, par joueur.</p>
          {distErr && <ErrorMsg msg={distErr} />}
          {analyticsLoading && <Spinner />}
          {!analyticsLoading && !distErr && returning.length === 0 && <p className="text-sm text-gray-400">Aucune donnée.</p>}
          {!analyticsLoading && returning.length > 0 && (
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
