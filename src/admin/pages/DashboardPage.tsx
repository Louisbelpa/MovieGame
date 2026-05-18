/**
 * admin/pages/DashboardPage.tsx
 * Dashboard Films + Séries.
 * Mobile : onglets Films / Séries. Desktop : deux colonnes côte à côte.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Film, Tv, Calendar, TrendingUp, Clapperboard, Users,
  AlertCircle, AlertTriangle, CalendarDays, User,
} from 'lucide-react'
import { getDashboard, type AdminDashboard, type AdminChallenge } from '../api'
function wikiTypeLabel(type: string | undefined): string {
  switch (type) {
    case 'politician': return 'Politique'
    case 'sportsperson': return 'Sport'
    case 'artist': return 'Art'
    case 'scientist': return 'Science'
    case 'entrepreneur': return 'Business'
    case 'writer': return 'Litterature'
    case 'historical_figure': return 'Histoire'
    default: return 'Personnalités'
  }
}
import { AdminLayout } from '../components/AdminLayout'
import { SegmentedToggle } from '../components/SegmentedToggle'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

/** Jours sans planning sur les 30 prochains (hors aujourd’hui) — paliers affichage + bannière */
function emptySlotsUrgency(count: number): 'ok' | 'low' | 'medium' | 'high' {
  if (count <= 0) return 'ok'
  if (count <= 5) return 'low'
  if (count <= 14) return 'medium'
  return 'high'
}

function alertIconClass(u: 'ok' | 'low' | 'medium' | 'high'): string {
  switch (u) {
    case 'ok': return 'text-slate-400'
    case 'low': return 'text-amber-500'
    case 'medium': return 'text-orange-500'
    default: return 'text-red-500'
  }
}

export function DashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'films' | 'series' | 'wiki'>('films')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard()
      .then((d) => { setData(d); setLastUpdated(new Date()) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  // Live polling every 30s once first load completes
  useEffect(() => {
    if (!data) return
    const id = setInterval(() => {
      getDashboard()
        .then((d) => { setData(d); setLastUpdated(new Date()) })
        .catch(() => {})
    }, 30_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data !== null])

  return (
    <AdminLayout>
      {loading && (
        <div className="flex items-center justify-center h-40">
          <span className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {data && (
        <div className="space-y-4">
          <PlanningGapBanner
            film={data.stats.unscheduled_film_next_30}
            series={data.stats.unscheduled_series_next_30}
            wiki={data.stats.unscheduled_wiki_next_30}
            onOpenCalendar={() => navigate('/admin/calendar')}
          />

          {/* ── Live indicator ── */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium text-green-600">Mise à jour en direct</span>
            {lastUpdated && (
              <span className="text-xs text-gray-400 ml-1">
                · Actualisé à {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* ── Barre du haut ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            {/* Taux globaux — label largeur fixe pour « Personnalités » + bloc centré verticalement avec le badge */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex justify-center sm:justify-start sm:shrink-0">
                <RateBadge label="Global" rate={data.stats.success_rate} color="teal" />
              </div>
              <div className="flex-1 space-y-2 min-w-0 w-full sm:py-0.5">
                <RateBar label="Films" rate={data.stats.film_success_rate} color="indigo" />
                <RateBar label="Séries" rate={data.stats.series_success_rate} color="violet" />
                <RateBar label="Personnalités" rate={data.stats.wiki_success_rate} color="slate" />
              </div>
            </div>
            {/* Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:flex sm:gap-2">
              <button
                onClick={() => navigate('/admin/films')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Film size={14} />
                <span className="hidden sm:inline">Gérer les </span>Films
              </button>
              <button
                onClick={() => navigate('/admin/series')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Tv size={14} />
                <span className="hidden sm:inline">Gérer les </span>Séries
              </button>
              <button
                onClick={() => navigate('/admin/calendar')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar size={14} />
                Planning
              </button>
              <button
                onClick={() => navigate('/admin/wiki')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <User size={14} />
                Personnalités
              </button>
            </div>
          </div>

          {/* ── Sélecteur d'onglets (mobile uniquement) ── */}
          <SegmentedToggle
            value={activeTab}
            onChange={setActiveTab}
            className="lg:hidden w-full"
            buttonClassName="flex-1"
            options={[
              { id: 'films', label: 'Films', icon: <Film size={15} /> },
              { id: 'series', label: 'Séries', icon: <Tv size={15} /> },
              { id: 'wiki', label: 'Personnalités', icon: <User size={15} /> },
            ]}
          />

          {/* ── Contenu : colonnes desktop / onglet mobile ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ─ Colonne Films ─ */}
            <div className={`space-y-4 ${activeTab !== 'films' ? 'hidden lg:block' : ''}`}>
              <SectionHeader
                icon={<Film size={15} className="text-indigo-500" />}
                label="Films"
                color="indigo"
                catalogCount={data.stats.total_films}
                catalogLabel="films actifs"
              />

              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<AlertCircle  size={17} className="text-amber-500"  />} label="Non planifiés"        value={data.stats.unused_films}               bg="bg-amber-50" />
                <StatCard icon={<CalendarDays size={17} className="text-indigo-400" />} label="Jours planifiés" value={data.stats.total_film_challenges} bg="bg-indigo-50" sub="hors aujourd'hui (Paris)" />
                <StatCard
                  icon={<AlertTriangle size={17} className={alertIconClass(emptySlotsUrgency(data.stats.unscheduled_film_next_30))} />}
                  label="Vides (30j)"
                  value={data.stats.unscheduled_film_next_30}
                  bg="bg-slate-50"
                  urgency={emptySlotsUrgency(data.stats.unscheduled_film_next_30)}
                />
                <StatCard icon={<Users        size={17} className="text-blue-500"   />} label="Parties aujourd'hui"  value={data.stats.today_film_games}            bg="bg-blue-50"   sub={data.stats.today_film_games > 0 ? `${data.stats.today_film_wins} gagnées` : undefined} />
                <StatCard icon={<TrendingUp   size={17} className="text-indigo-500" />} label="Taux de réussite"     value={data.stats.film_success_rate   !== null ? `${data.stats.film_success_rate} %`   : '—'} bg="bg-indigo-50" />
                <StatCard icon={<TrendingUp   size={17} className="text-teal-500"   />} label="Taux défi du jour"    value={data.stats.today_film_rate     !== null ? `${data.stats.today_film_rate} %`     : '—'} bg="bg-teal-50"   sub={data.stats.today_film_games > 0 ? `sur ${data.stats.today_film_games} partie${data.stats.today_film_games > 1 ? 's' : ''}` : undefined} />
              </div>

              <div>
                <SectionLabel>Défi du jour</SectionLabel>
                {data.today_film_challenge
                  ? <ChallengeCard challenge={data.today_film_challenge} />
                  : <EmptyChallenge label="Aucun film planifié aujourd'hui" />}
              </div>

              <UpcomingList challenges={data.upcoming_film_challenges} />
            </div>

            {/* ─ Colonne Séries ─ */}
            <div className={`space-y-4 ${activeTab !== 'series' ? 'hidden lg:block' : ''}`}>
              <SectionHeader
                icon={<Tv size={15} className="text-violet-500" />}
                label="Séries"
                color="violet"
                catalogCount={data.stats.total_series}
                catalogLabel="séries actives"
              />

              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<AlertCircle  size={17} className="text-amber-500"  />} label="Non planifiées"       value={data.stats.unused_series}              bg="bg-amber-50" />
                <StatCard icon={<CalendarDays size={17} className="text-violet-400" />} label="Jours planifiés" value={data.stats.total_series_challenges} bg="bg-violet-50" sub="hors aujourd'hui (Paris)" />
                <StatCard
                  icon={<AlertTriangle size={17} className={alertIconClass(emptySlotsUrgency(data.stats.unscheduled_series_next_30))} />}
                  label="Vides (30j)"
                  value={data.stats.unscheduled_series_next_30}
                  bg="bg-slate-50"
                  urgency={emptySlotsUrgency(data.stats.unscheduled_series_next_30)}
                />
                <StatCard icon={<Users        size={17} className="text-blue-500"   />} label="Parties aujourd'hui"  value={data.stats.today_series_games}          bg="bg-blue-50"   sub={data.stats.today_series_games > 0 ? `${data.stats.today_series_wins} gagnées` : undefined} />
                <StatCard icon={<TrendingUp   size={17} className="text-violet-500" />} label="Taux de réussite"     value={data.stats.series_success_rate !== null ? `${data.stats.series_success_rate} %` : '—'} bg="bg-violet-50" />
                <StatCard icon={<TrendingUp   size={17} className="text-teal-500"   />} label="Taux défi du jour"    value={data.stats.today_series_rate   !== null ? `${data.stats.today_series_rate} %`   : '—'} bg="bg-teal-50"   sub={data.stats.today_series_games > 0 ? `sur ${data.stats.today_series_games} partie${data.stats.today_series_games > 1 ? 's' : ''}` : undefined} />
              </div>

              <div>
                <SectionLabel>Défi du jour</SectionLabel>
                {data.today_series_challenge
                  ? <ChallengeCard challenge={data.today_series_challenge} />
                  : <EmptyChallenge label="Aucune série planifiée aujourd'hui" />}
              </div>

              <UpcomingList challenges={data.upcoming_series_challenges} />
            </div>

            {/* ─ Colonne Personnalités ─ */}
            <div className={`space-y-4 ${activeTab !== 'wiki' ? 'hidden lg:block' : ''}`}>
              <SectionHeader
                icon={<User size={15} className="text-slate-500" />}
                label="Personnalités"
                color="slate"
                catalogCount={data.stats.total_wiki_persons}
                catalogLabel="fiches actives"
              />

              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<AlertCircle size={17} className="text-amber-500" />} label="Non planifiées" value={data.stats.unused_wiki_persons} bg="bg-amber-50" />
                <StatCard icon={<CalendarDays size={17} className="text-slate-400" />} label="Jours planifiés" value={data.stats.total_wiki_challenges} bg="bg-slate-50" sub="hors aujourd'hui (Paris)" />
                <StatCard
                  icon={<AlertTriangle size={17} className={alertIconClass(emptySlotsUrgency(data.stats.unscheduled_wiki_next_30))} />}
                  label="Vides (30j)"
                  value={data.stats.unscheduled_wiki_next_30}
                  bg="bg-slate-50"
                  urgency={emptySlotsUrgency(data.stats.unscheduled_wiki_next_30)}
                />
                <StatCard icon={<Users size={17} className="text-blue-500" />} label="Parties aujourd'hui" value={data.stats.today_wiki_games} bg="bg-blue-50" sub={data.stats.today_wiki_games > 0 ? `${data.stats.today_wiki_wins} gagnées` : undefined} />
                <StatCard icon={<TrendingUp size={17} className="text-slate-500" />} label="Taux de réussite" value={data.stats.wiki_success_rate !== null ? `${data.stats.wiki_success_rate} %` : '—'} bg="bg-slate-50" />
                <StatCard icon={<TrendingUp size={17} className="text-teal-500" />} label="Taux défi du jour" value={data.stats.today_wiki_rate !== null ? `${data.stats.today_wiki_rate} %` : '—'} bg="bg-teal-50" sub={data.stats.today_wiki_games > 0 ? `sur ${data.stats.today_wiki_games} partie${data.stats.today_wiki_games > 1 ? 's' : ''}` : undefined} />
              </div>

              <div>
                <SectionLabel>Défi du jour</SectionLabel>
                {data.today_wiki_challenge
                  ? <ChallengeCard challenge={data.today_wiki_challenge} />
                  : <EmptyChallenge label="Aucune personnalité planifiée aujourd'hui" />}
              </div>

              <UpcomingList challenges={data.upcoming_wiki_challenges} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanningGapBanner({
  film,
  series,
  wiki,
  onOpenCalendar,
}: {
  film: number
  series: number
  wiki: number
  onOpenCalendar: () => void
}) {
  const maxU = Math.max(film, series, wiki)
  if (maxU <= 0) return null
  const level = emptySlotsUrgency(maxU)
  const wrap =
    level === 'low'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : level === 'medium'
        ? 'border-orange-200 bg-orange-50 text-orange-950'
        : 'border-red-200 bg-red-50 text-red-900'
  const title =
    level === 'high'
      ? 'Planning critique'
      : level === 'medium'
        ? 'Attention au planning'
        : 'Quelques trous dans le planning'

  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${wrap}`}>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm opacity-90">
          Sur les 30 prochains jours (hors aujourd’hui) :{' '}
          <span className="font-medium tabular-nums">{film}</span> jour(s) sans film,{' '}
          <span className="font-medium tabular-nums">{series}</span> sans série,{' '}
          <span className="font-medium tabular-nums">{wiki}</span> sans personnalité.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenCalendar}
        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white/80 border border-current/20 hover:bg-white transition-colors"
      >
        <Calendar size={14} />
        Ouvrir le calendrier
      </button>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{children}</p>
}

function SectionHeader({
  icon,
  label,
  color,
  catalogCount,
  catalogLabel,
}: {
  icon: React.ReactNode
  label: string
  color: 'indigo' | 'violet' | 'slate'
  catalogCount: number
  catalogLabel: string
}) {
  const cls = color === 'indigo'
    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
    : color === 'violet'
      ? 'border-violet-200 bg-violet-50 text-violet-700'
      : 'border-slate-200 bg-slate-50 text-slate-700'
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 rounded-lg border ${cls}`}>
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-xs font-medium opacity-80 whitespace-nowrap">
        {catalogCount} {catalogLabel}
      </span>
    </div>
  )
}

function RateBadge({ label, rate, color }: { label: string; rate: number | null; color: 'teal' | 'indigo' | 'violet' }) {
  const cls = {
    teal:   'bg-teal-50   border-teal-200   text-teal-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  }[color]
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-lg border ${cls} min-w-[80px]`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-bold">{rate !== null ? `${rate} %` : '—'}</span>
    </div>
  )
}

function RateBar({ label, rate, color }: { label: string; rate: number | null; color: 'indigo' | 'violet' | 'slate' }) {
  const cls = {
    indigo: { text: 'text-indigo-600', bar: 'bg-indigo-400', track: 'bg-indigo-100' },
    violet: { text: 'text-violet-600', bar: 'bg-violet-400', track: 'bg-violet-100' },
    slate: { text: 'text-slate-600', bar: 'bg-slate-400', track: 'bg-slate-100' },
  }[color]
  return (
    <div className="grid grid-cols-[minmax(6.5rem,8.75rem)_minmax(0,1fr)_2.75rem] items-center gap-x-2 gap-y-0.5">
      <span className="text-sm text-gray-500 leading-tight">{label}</span>
      <div className={`min-w-0 h-2 rounded-full ${cls.track} overflow-hidden self-center`}>
        <div className={`h-full rounded-full ${cls.bar} transition-all`} style={{ width: `${rate ?? 0}%` }} />
      </div>
      <span className={`text-sm font-semibold ${cls.text} tabular-nums text-right`}>
        {rate !== null ? `${rate} %` : '—'}
      </span>
    </div>
  )
}

function StatCard({ icon, label, value, bg, warn, sub, urgency }: {
  icon: React.ReactNode; label: string; value: string | number
  bg: string; warn?: boolean; sub?: string
  urgency?: 'ok' | 'low' | 'medium' | 'high'
}) {
  const cardU = urgency ?? (warn ? 'high' : 'ok')
  const border =
    cardU === 'low'
      ? 'border-amber-200'
      : cardU === 'medium'
        ? 'border-orange-200'
        : cardU === 'high' || warn
          ? 'border-red-200'
          : 'border-gray-200'
  const valueCls =
    cardU === 'low'
      ? 'text-amber-800'
      : cardU === 'medium'
        ? 'text-orange-800'
        : cardU === 'high' || warn
          ? 'text-red-600'
          : 'text-gray-900'
  const iconBox =
    cardU === 'low'
      ? 'bg-amber-100'
      : cardU === 'medium'
        ? 'bg-orange-100'
        : cardU === 'high' || warn
          ? 'bg-red-100'
          : bg

  return (
    <div className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${border}`}>
      <div className={`w-8 h-8 ${iconBox} rounded-lg flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        <p className={`text-lg font-bold leading-tight tabular-nums ${valueCls}`}>{value}</p>
        {sub && <p className="text-sm text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

function ChallengeCard({ challenge }: { challenge: AdminChallenge }) {
  const media = challenge.film ?? challenge.series ?? challenge.wiki
  const isSeries = challenge.mediaType === 'series'
  const isWiki = challenge.mediaType === 'wiki'
  const subtitle = isSeries
    ? `${challenge.series?.year ?? '—'} · ${(challenge.series as { creator?: string })?.creator ?? ''}`
    : isWiki
      ? `${wikiTypeLabel(challenge.wiki?.person_type)} · difficulté ${challenge.wiki?.difficulty ?? '—'}`
      : `${challenge.film?.year ?? '—'} · ${(challenge.film as { director?: string })?.director ?? ''}`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 flex gap-3 sm:gap-4 items-center">
      {media?.image_url ? (
        <img src={media.image_url} alt={media.title} className="w-16 h-11 sm:w-20 sm:h-14 object-cover rounded-lg flex-shrink-0 border border-gray-100" />
      ) : (
        <div className="w-16 h-11 sm:w-20 sm:h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          {isWiki ? <User size={20} className="text-gray-400" /> : isSeries ? <Tv size={20} className="text-gray-400" /> : <Clapperboard size={20} className="text-gray-400" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{media?.title}</p>
        <p className="text-sm text-gray-500 truncate">{subtitle}</p>
        <p className="text-sm text-gray-400 mt-0.5 truncate">{formatDate(challenge.date)}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
        isWiki ? 'bg-slate-100 text-slate-700' : isSeries ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'
      }`}>
        #{challenge.challengeNumber}
      </span>
    </div>
  )
}

function UpcomingList({ challenges }: { challenges: AdminChallenge[] }) {
  return (
    <div>
      <SectionLabel>7 prochains défis</SectionLabel>
      {challenges.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Aucun défi planifié.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {challenges.map((ch) => {
            const media = ch.film ?? ch.series ?? ch.wiki
            const isSeries = ch.mediaType === 'series'
            const isWiki = ch.mediaType === 'wiki'
            return (
              <div key={ch.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5">
                {media?.image_url ? (
                  <img src={media.image_url} alt={media.title} className="w-9 h-6 object-cover rounded border border-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-9 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    {isWiki ? <User size={11} className="text-gray-400" /> : isSeries ? <Tv size={11} className="text-gray-400" /> : <Clapperboard size={11} className="text-gray-400" />}
                  </div>
                )}
                <span className="text-sm text-gray-400 w-20 sm:w-24 flex-shrink-0">{formatDateShort(ch.date)}</span>
                <span className="text-sm text-gray-800 font-medium truncate">{media?.title}</span>
                <span className="text-sm text-gray-400 ml-auto flex-shrink-0">
                  {isWiki ? wikiTypeLabel(ch.wiki?.person_type) : (ch.series?.year ?? ch.film?.year ?? '—')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyChallenge({ label }: { label: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
      {label}
    </div>
  )
}
