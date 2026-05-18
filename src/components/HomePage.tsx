import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Film, Tv, User, ChevronRight, LogIn, Flame, Users, Smartphone } from 'lucide-react'
import { ApertureIcon } from '@/components/ui/ApertureIcon'
import { Footer } from '@/components/layout/Footer'
import { TopNav } from '@/components/layout/TopNav'
import { AuthModal, useAuthModal } from '@/components/modals/AuthModal'
import { FEATURES, IOS_APP_STORE_URL } from '@/config/features'
import { useAuthStore } from '@/store/authStore'
import { loadStats, loadHistory, setHistoryEntry } from '@/lib/storage'
import { friendsGetAll, fetchChallenge, type FriendEntry } from '@/api/client'
import { fetchWikiChallenge } from '@/api/wikiClient'
import { FriendsSidebar } from '@/components/home/FriendsSidebar'
import {
  NewModesAnnouncementModal,
  NEW_MODES_ANNOUNCEMENT_STORAGE_KEY,
  type NewModesAnnouncementVariant,
} from '@/components/modals/NewModesAnnouncementModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

function getTodayLabel(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

function useCountdown(): string {
  const [str, setStr] = useState('')
  useEffect(() => {
    function update() {
      const now = new Date()
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(now)
      const h = +(parts.find((p) => p.type === 'hour')?.value ?? '0')
      const m = +(parts.find((p) => p.type === 'minute')?.value ?? '0')
      const s = +(parts.find((p) => p.type === 'second')?.value ?? '0')
      const total = (23 - h) * 3600 + (59 - m) * 60 + (60 - s)
      const hh = String(Math.floor(total / 3600)).padStart(2, '0')
      const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
      const ss = String(total % 60).padStart(2, '0')
      setStr(`${hh}:${mm}:${ss}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return str
}


type TodayStatus = 'won' | 'lost' | null

function outcomeFromChallenge(payload: {
  isGameOver: boolean
  outcome: 'won' | 'lost' | null
}): TodayStatus {
  if (!payload.isGameOver || payload.outcome == null) return null
  return payload.outcome
}

// ─── Mobile header ────────────────────────────────────────────────────────────

function MobileHeader() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    loadStats('wiki').currentStreak,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-4">
      <a
        href="/"
        aria-label="Accueil GuessToday"
        className="inline-flex items-center gap-2 rounded-lg px-1 -mx-1 min-h-[44px] text-film-text transition-colors"
      >
        <ApertureIcon size={22} id="ap-home" />
        <span className="font-title text-xl leading-none tracking-tight">
          <span className="font-[500] text-film-text">Guess</span>
          <span className="italic font-[600] text-gradient-gold">today</span>
        </span>
      </a>
      <div className="flex items-center gap-2">
        {maxStreak > 0 && (
          <a
            href="/profile"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400"
          >
            <Flame size={12} aria-hidden />
            {maxStreak}
          </a>
        )}
        {isLoading ? (
          <div className="w-7 h-7 rounded-full bg-film-gray animate-pulse" />
        ) : user ? (
          <a
            href="/profile"
            className="w-7 h-7 rounded-full bg-film-gold/20 border border-film-gold/40 flex items-center justify-center text-xs font-bold text-film-gold overflow-hidden"
          >
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              : user.displayName.charAt(0).toUpperCase()
            }
          </a>
        ) : (
          <button
            type="button"
            onClick={() => openAuth('login')}
            className="flex items-center gap-1 text-xs text-film-text-dim border border-film-border rounded-full px-2.5 py-1 bg-film-dark"
          >
            <LogIn size={12} />
            Connexion
          </button>
        )}
      </div>
    </header>
  )
}

// ─── Game card ────────────────────────────────────────────────────────────────

interface GameCardProps {
  href: string
  icon: React.ReactElement
  modeLabel: string
  description: string
  accentColor: string
  accentSoft: string
  accentRing: string
  disabled?: boolean
  badge?: string
  todayStatus?: 'won' | 'lost' | null
}

function GameCard({ href, icon, modeLabel, description, accentColor, disabled, badge, todayStatus }: GameCardProps) {
  const showPlayButton = !todayStatus && !disabled
  const Tag = disabled ? 'div' : 'a'

  return (
    <>
      {/* ── Desktop card ── */}
      <Tag
        {...(!disabled ? { href } : {})}
        className={`group hidden lg:flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ${
          disabled ? 'opacity-40 cursor-default' : 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl'
        }`}
        style={{
          background: '#2c2c54',
          border: `1.5px solid ${accentColor}55`,
          boxShadow: '0 4px 24px rgba(44,44,84,0.18)',
        }}
      >
        {/* Trait accent top */}
        <div className="h-[3px]" style={{ background: accentColor }} />

        {/* Zone visuelle centrale */}
        <div
          className="relative flex flex-col items-center justify-center gap-5 flex-1 py-12 px-6"
          style={{ background: `radial-gradient(ellipse 90% 70% at 50% 110%, ${accentColor}30, transparent 65%)` }}
        >
          {/* Badges statut */}
          {todayStatus === 'won' && (
            <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(33,140,116,0.25)', color: '#33d9b2', border: '1px solid rgba(33,140,116,0.4)' }}>
              <CheckCircle2 size={10} /> Gagné
            </span>
          )}
          {todayStatus === 'lost' && (
            <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(179,57,57,0.22)', color: '#ff7070', border: '1px solid rgba(179,57,57,0.35)' }}>
              <XCircle size={10} /> Perdu
            </span>
          )}
          {badge && !todayStatus && (
            <span className="absolute top-4 left-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: accentColor, color: '#2c2c54' }}>
              {badge}
            </span>
          )}

          {/* Icône dans un carré */}
          <div
            className="p-4 rounded-2xl transition-transform duration-300 group-hover:scale-110"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 48 })}
          </div>

          {/* Nom + description */}
          <div className="text-center">
            <p className="font-title text-2xl font-bold text-white leading-tight">{modeLabel}</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>{description}</p>
          </div>
        </div>

        {/* CTA bottom */}
        <div className="px-5 pb-5 pt-3">
          {showPlayButton ? (
            <div
              className="w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all duration-200 group-hover:brightness-110"
              style={{ background: accentColor, color: '#2c2c54' }}
            >
              Jouer →
            </div>
          ) : todayStatus === 'won' ? (
            <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
              style={{ background: 'rgba(33,140,116,0.15)', color: '#33d9b2', border: '1px solid rgba(33,140,116,0.25)' }}>
              ✓ Terminé
            </div>
          ) : todayStatus === 'lost' ? (
            <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
              style={{ background: 'rgba(179,57,57,0.12)', color: '#ff7070', border: '1px solid rgba(179,57,57,0.22)' }}>
              Réessayer demain
            </div>
          ) : null}
        </div>
      </Tag>

      {/* ── Mobile row ── */}
      <Tag
        {...(!disabled ? { href } : {})}
        className={`lg:hidden relative flex items-center gap-0 rounded-2xl overflow-hidden transition-all active:scale-[0.98] ${
          disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'
        }`}
        style={{
          background: '#2c2c54',
          border: `1.5px solid ${accentColor}50`,
          boxShadow: '0 2px 12px rgba(44,44,84,0.14)',
        }}
      >
        {/* Trait accent gauche */}
        <div className="w-[3px] self-stretch shrink-0" style={{ background: accentColor }} />

        {/* Icône */}
        <div
          className="w-12 h-12 flex items-center justify-center shrink-0 m-3.5 rounded-xl"
          style={{ background: `${accentColor}22`, color: accentColor }}
        >
          {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 22 })}
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0 py-4">
          <p className="text-sm font-bold text-white leading-tight">{modeLabel}</p>
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.42)' }}>{description}</p>
        </div>

        {/* Bouton / statut */}
        <div className="pr-4 shrink-0">
          {showPlayButton ? (
            <span
              className="flex items-center gap-1 text-xs font-bold px-3.5 py-2 rounded-xl"
              style={{ background: accentColor, color: '#2c2c54' }}
            >
              Jouer <ChevronRight size={13} />
            </span>
          ) : todayStatus === 'won' ? (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
              style={{ color: '#33d9b2', background: 'rgba(33,140,116,0.2)', border: '1px solid rgba(33,140,116,0.3)' }}>
              <CheckCircle2 size={13} /> Gagné
            </span>
          ) : todayStatus === 'lost' ? (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
              style={{ color: '#ff7070', background: 'rgba(179,57,57,0.15)', border: '1px solid rgba(179,57,57,0.25)' }}>
              <XCircle size={13} /> Perdu
            </span>
          ) : (
            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
          )}
        </div>
      </Tag>
    </>
  )
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

function StatsStrip() {
  const film   = loadStats('film')
  const wiki   = loadStats('wiki')
  const series = FEATURES.enableSeries ? loadStats('series') : { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 }

  const total  = film.gamesPlayed  + wiki.gamesPlayed  + series.gamesPlayed
  const wins   = film.gamesWon     + wiki.gamesWon     + series.gamesWon
  const streak = Math.max(film.currentStreak, wiki.currentStreak, series.currentStreak)
  const record = Math.max(film.maxStreak,     wiki.maxStreak,     series.maxStreak)

  if (total === 0) return null

  const winPct = Math.round((wins / total) * 100)

  const items = [
    { label: 'joués',     value: String(total) },
    { label: 'victoires', value: `${winPct}%` },
    { label: 'série',     value: streak > 0 ? `${streak} 🔥` : '0' },
    { label: 'record',    value: String(record) },
  ]

  return (
    <div className="hidden lg:flex items-center justify-center gap-2 w-full mt-6 py-3.5 rounded-2xl"
      style={{ background: '#2c2c54', border: '1px solid rgba(255,177,66,0.18)' }}>
      {items.map(({ label, value }, i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="text-white/20 select-none">·</span>}
          <span className="flex items-baseline gap-1.5">
            <strong className="font-title text-lg font-bold" style={{ color: 'var(--sg-films)' }}>{value}</strong>
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Account nudge ────────────────────────────────────────────────────────────

function AccountNudge() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const streak = Math.max(loadStats('film').currentStreak, loadStats('wiki').currentStreak)
  if (isLoading || user || streak === 0) return null

  return (
    <div className="w-full mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Flame size={16} className="text-amber-400 shrink-0" />
        <p className="text-sm text-film-text-dim truncate">
          Série de <strong className="text-film-text">{streak}</strong> jour{streak > 1 ? 's' : ''} — sauvegarde-la sur un compte gratuit.
        </p>
      </div>
      <button
        type="button"
        onClick={() => openAuth('register')}
        className="shrink-0 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
        style={{ background: 'var(--sg-films-soft)', color: 'var(--sg-films)', border: '1px solid var(--sg-films-ring)' }}
      >
        Créer un compte
      </button>
    </div>
  )
}

// ─── Mobile auth nudge ───────────────────────────────────────────────────────

function MobileAuthNudge() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  if (isLoading || user) return null

  return (
    <div className="lg:hidden mt-4 rounded-xl border border-film-border bg-film-dark p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-film-gray flex items-center justify-center shrink-0">
        <Users size={16} className="text-film-text-dim" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-film-text">Rejoins tes amis</p>
        <p className="text-xs text-film-text-dim mt-0.5 leading-snug">Sauvegarde tes stats et compare tes scores.</p>
      </div>
      <button
        type="button"
        onClick={() => openAuth('register')}
        className="shrink-0 text-xs font-semibold rounded-lg px-3 py-2 text-film-black"
        style={{ background: 'var(--color-film-gold)' }}
      >
        S'inscrire
      </button>
    </div>
  )
}



// ─── iOS app banner ───────────────────────────────────────────────────────────

function AppStoreBadge({ className }: { className?: string }) {
  return (
    <img
      src="/app-store-badge-fr.svg"
      alt="Télécharger dans l'App Store"
      className={className}
      height={46}
    />
  )
}

function IosAppBanner() {
  if (!FEATURES.enableIosBanner) return null

  return (
    <div className="mt-8">
      <a
        href={IOS_APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3.5 rounded-xl px-4 py-3.5 transition-all hover:brightness-110 active:opacity-80"
      style={{
        background: 'linear-gradient(135deg, rgba(212,166,74,0.10) 0%, rgba(107,124,255,0.08) 100%)',
        border: '1px solid rgba(212,166,74,0.22)',
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(212,166,74,0.12)', color: '#d4a64a' }}
      >
        <Smartphone size={20} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-film-text leading-tight">
          GuessToday sur iOS
        </p>
        <p className="text-xs text-film-text-dim/60 mt-0.5 leading-snug">
          Gratuit — iPhone &amp; iPad
        </p>
      </div>

      {/* Official App Store badge */}
      <AppStoreBadge className="shrink-0 h-8 w-auto" />
    </a>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const [announcementVariant, setAnnouncementVariant] = useState<NewModesAnnouncementVariant | null>(null)
  const [showNewBadge, setShowNewBadge] = useState(false)
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [serverToday, setServerToday] = useState<{
    film: TodayStatus
    series: TodayStatus
    wiki: TodayStatus
  } | null>(null)

  const fetchMe     = useAuthStore((s) => s.fetchMe)
  const user        = useAuthStore((s) => s.user)
  const serverStats = useAuthStore((s) => s.serverStats)

  const today        = getTodayParis()
  const todayLabel   = getTodayLabel()
  const localFilm    = loadHistory('film')[today]   ?? null
  const localSeries  = loadHistory('series')[today] ?? null
  const localWiki    = loadHistory('wiki')[today]   ?? null
  const filmStatus   = serverToday?.film   ?? localFilm
  const seriesStatus = serverToday?.series ?? localSeries
  const wikiStatus   = serverToday?.wiki   ?? localWiki
  const countdown    = useCountdown()

  const currentStreak = Math.max(
    serverStats.film?.currentStreak   ?? loadStats('film').currentStreak,
    serverStats.wiki?.currentStreak   ?? loadStats('wiki').currentStreak,
    FEATURES.enableSeries ? (serverStats.series?.currentStreak ?? loadStats('series').currentStreak) : 0,
  )

  useEffect(() => { void fetchMe() }, [fetchMe])

  useEffect(() => {
    if (!user) {
      setServerToday(null)
      return
    }

    let cancelled = false

    async function syncTodayFromServer() {
      const [filmRes, seriesRes, wikiRes] = await Promise.allSettled([
        fetchChallenge('film'),
        FEATURES.enableSeries ? fetchChallenge('series') : Promise.resolve(null),
        FEATURES.enableWiki ? fetchWikiChallenge() : Promise.resolve(null),
      ])

      if (cancelled) return

      const film = filmRes.status === 'fulfilled' ? outcomeFromChallenge(filmRes.value) : null
      const series =
        seriesRes.status === 'fulfilled' && seriesRes.value
          ? outcomeFromChallenge(seriesRes.value)
          : null
      const wiki =
        wikiRes.status === 'fulfilled' && wikiRes.value
          ? outcomeFromChallenge(wikiRes.value)
          : null

      setServerToday({ film, series, wiki })

      if (film) setHistoryEntry(today, film, 'film')
      if (series) setHistoryEntry(today, series, 'series')
      if (wiki) setHistoryEntry(today, wiki, 'wiki')
    }

    void syncTodayFromServer()
    const onFocus = () => { void syncTodayFromServer() }
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [user, today])

  useEffect(() => {
    if (!user) { setFriends([]); return }
    setFriendsLoading(true)
    friendsGetAll(today)
      .then((r) => setFriends(r.friends ?? []))
      .catch(() => {})
      .finally(() => setFriendsLoading(false))
  }, [user, today])

  useEffect(() => {
    try {
      if (localStorage.getItem(NEW_MODES_ANNOUNCEMENT_STORAGE_KEY)) return
      if (FEATURES.enableSeries && FEATURES.enableWiki) setAnnouncementVariant('both')
      else if (FEATURES.enableSeries) setAnnouncementVariant('series')
      else if (FEATURES.enableWiki)   setAnnouncementVariant('wiki')
      setShowNewBadge(true)
    } catch {}
  }, [])

  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(clamp(28rem,44vw,52rem) clamp(18rem,30vw,34rem) at 12% 5%, rgba(255,177,66,0.08), transparent 62%), radial-gradient(clamp(26rem,42vw,50rem) clamp(16rem,28vw,32rem) at 90% 80%, rgba(112,111,211,0.07), transparent 64%)',
        }}
      />

      <div className="flex-1 w-full relative flex flex-col">
        <TopNav />
        <MobileHeader />

        <div className="flex-1 max-w-3xl w-full mx-auto pb-6 px-4 lg:px-6">

          {/* ── Main column ── */}
          <div>
            {/* Hero: title + countdown */}
            <div className="flex items-start justify-between gap-4 mt-4 mb-7">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-film-text-dim/50 mb-2">
                  {todayLabel}
                </p>
                <h1 className="text-2xl lg:text-[1.75rem] font-bold text-film-text leading-tight tracking-tight">
                  À toi de trouver.
                </h1>
                <p className="text-sm text-film-text-dim/70 mt-1.5 leading-snug">
                  Films, séries, personnalités — un nouveau défi chaque jour.
                </p>
                {user && currentStreak > 0 && (
                  <a
                    href="/profile"
                    className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
                  >
                    <Flame size={13} className="text-amber-400" aria-hidden />
                    <span className="text-xs font-semibold text-amber-400">
                      {currentStreak} jour{currentStreak > 1 ? 's' : ''} de série
                    </span>
                  </a>
                )}
              </div>
              {countdown && (
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-film-text-dim/40 mb-1">
                    Prochain défi
                  </p>
                  <p className="font-mono text-[22px] font-bold text-film-text/60 tabular-nums leading-none">
                    {countdown}
                  </p>
                </div>
              )}
            </div>

            {/* Game cards */}
            <div className={`flex flex-col gap-3 lg:grid lg:gap-4 ${FEATURES.enableSeries || FEATURES.enableWiki ? 'lg:grid-cols-3' : 'lg:grid-cols-1 lg:max-w-sm'}`}>
              <GameCard
                href="/films"
                icon={<Film />}
                modeLabel="Films"
                description="Identifie le film du jour à partir d'une scène et d'indices"
                accentColor="var(--sg-films)"
                accentSoft="var(--sg-films-soft)"
                accentRing="var(--sg-films-ring)"
                todayStatus={filmStatus}
              />

              {FEATURES.enableSeries ? (
                <GameCard
                  href="/series"
                  icon={<Tv />}
                  modeLabel="Séries"
                  description="Identifie la série du jour à partir d'une scène et d'indices"
                  accentColor="var(--sg-series)"
                  accentSoft="var(--sg-series-soft)"
                  accentRing="var(--sg-series-ring)"
                  badge={showNewBadge ? 'Nouveau' : undefined}
                  todayStatus={seriesStatus}
                />
              ) : (
                <GameCard
                  href="/series"
                  icon={<Tv />}
                  modeLabel="Séries"
                  description="Identifie la série du jour à partir d'une scène et d'indices"
                  accentColor="var(--sg-series)"
                  accentSoft="var(--sg-series-soft)"
                  accentRing="var(--sg-series-ring)"
                  disabled
                />
              )}

              {FEATURES.enableWiki ? (
                <GameCard
                  href="/wiki"
                  icon={<User />}
                  modeLabel="Personnalités"
                  description="Devine une personnalité célèbre à partir d'indices sur sa carrière"
                  accentColor="var(--sg-wiki)"
                  accentSoft="var(--sg-wiki-soft)"
                  accentRing="var(--sg-wiki-ring)"
                  badge={showNewBadge ? 'Nouveau' : undefined}
                  todayStatus={wikiStatus}
                />
              ) : (
                <GameCard
                  href="/wiki"
                  icon={<User />}
                  modeLabel="Personnalités"
                  description="Devine une personnalité célèbre à partir d'indices sur sa carrière"
                  accentColor="var(--sg-wiki)"
                  accentSoft="var(--sg-wiki-soft)"
                  accentRing="var(--sg-wiki-ring)"
                  disabled
                />
              )}
            </div>

            {/* Stats strip — desktop only */}
            <StatsStrip />

            {/* Friends block */}
            <div className="mt-5">
              <FriendsSidebar friends={friends} loading={friendsLoading} />
            </div>

            {/* Account nudge (streak save) */}
            <AccountNudge />

            {/* Auth nudge — mobile only, non-logged */}
            <MobileAuthNudge />

            {/* iOS app banner — bottom of column, after all game/social content */}
            <IosAppBanner />
          </div>
        </div>
      </div>

      <Footer />
      <AuthModal />

      {announcementVariant && (
        <NewModesAnnouncementModal
          isOpen
          onClose={() => setAnnouncementVariant(null)}
          variant={announcementVariant}
        />
      )}
    </div>
  )
}
