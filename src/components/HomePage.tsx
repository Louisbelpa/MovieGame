import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Film, Tv, User, LogIn, Flame, Smartphone } from 'lucide-react'
import { ApertureIcon } from '@/components/ui/ApertureIcon'
import { Footer } from '@/components/layout/Footer'
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

// ─── HomeHeader ───────────────────────────────────────────────────────────────

function HomeHeader() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const todayLabel = getTodayLabel()
  const countdown = useCountdown()

  return (
    <header
      className="h-14 flex items-center justify-between px-4 lg:px-6 shrink-0"
      style={{ background: '#0b0b1a', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Logo */}
      <a href="/" className="inline-flex items-center gap-2">
        <ApertureIcon size={20} />
        <span className="font-title text-lg leading-none">
          <span className="font-[500]" style={{ color: '#ece9e2' }}>Guess</span>
          <span className="italic font-[700] text-gradient-gold">today</span>
        </span>
      </a>

      {/* Centre : date + countdown */}
      <div className="hidden sm:flex flex-col items-center leading-none gap-0.5">
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(236,233,226,0.4)' }}>
          {todayLabel}
        </span>
        {countdown && (
          <span className="font-mono text-sm font-bold" style={{ color: '#ece9e2' }}>
            {countdown}
          </span>
        )}
      </div>

      {/* Droite : avatar ou connexion */}
      {isLoading ? (
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: '#f0efec' }} />
      ) : user ? (
        <a
          href="/profile"
          className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
          style={{
            background: 'var(--sg-films-soft)',
            border: '1.5px solid var(--sg-films-ring)',
            color: 'var(--sg-films)',
          }}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            user.displayName.charAt(0).toUpperCase()
          )}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#ece9e2', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <LogIn size={12} />
          <span className="hidden sm:inline">Se connecter</span>
        </button>
      )}
    </header>
  )
}

// ─── GameCard ─────────────────────────────────────────────────────────────────

interface GameCardProps {
  href: string
  icon: React.ReactElement
  modeLabel: string
  description: string
  accentColor: string
  disabled?: boolean
  badge?: string
  todayStatus?: TodayStatus
}

function GameCard({ href, icon, modeLabel, description, accentColor, disabled, badge, todayStatus }: GameCardProps) {
  const showPlay = !todayStatus && !disabled
  const Tag = disabled ? 'div' : 'a'

  return (
    <Tag
      {...(!disabled ? { href } : {})}
      className={`relative flex flex-col justify-between p-4 sm:p-5 lg:p-8 overflow-hidden transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'
      }`}
      style={{
        background: '#13132b',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Dégradé accent depuis le coin bas-droit */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 100% 80% at 110% 120%, ${accentColor}45, transparent 55%)`,
        }}
      />

      {/* Texture subtile (points) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Haut : icône + badge */}
      <div className="relative flex items-start justify-between">
        <div
          className="p-2.5 lg:p-3 rounded-2xl"
          style={{ background: `${accentColor}28`, color: accentColor }}
        >
          {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 22 })}
        </div>

        {todayStatus === 'won' && (
          <span
            className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(33,140,116,0.25)',
              color: '#33d9b2',
              border: '1px solid rgba(33,140,116,0.4)',
            }}
          >
            <CheckCircle2 size={9} /> Gagné
          </span>
        )}
        {todayStatus === 'lost' && (
          <span
            className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(179,57,57,0.25)',
              color: '#ff7070',
              border: '1px solid rgba(179,57,57,0.4)',
            }}
          >
            <XCircle size={9} /> Perdu
          </span>
        )}
        {badge && !todayStatus && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{ background: accentColor, color: '#0b0b1a' }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Bas : titre + description + CTA */}
      <div className="relative">
        <p
          className="font-title font-bold text-white leading-none mb-2"
          style={{ fontSize: 'clamp(1.6rem, 5vw, 3.5rem)' }}
        >
          {modeLabel}
        </p>
        <p className="hidden sm:block text-sm mb-4 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {description}
        </p>

        {showPlay ? (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
            style={{ background: accentColor, color: '#0b0b1a' }}
          >
            Jouer →
          </div>
        ) : todayStatus === 'won' ? (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{
              background: 'rgba(33,140,116,0.2)',
              color: '#33d9b2',
              border: '1px solid rgba(33,140,116,0.35)',
            }}
          >
            <CheckCircle2 size={14} /> Terminé
          </div>
        ) : todayStatus === 'lost' ? (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{
              background: 'rgba(179,57,57,0.18)',
              color: '#ff7070',
              border: '1px solid rgba(179,57,57,0.3)',
            }}
          >
            Réessayer demain
          </div>
        ) : null}
      </div>
    </Tag>
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

// ─── Shared iOS banner ────────────────────────────────────────────────────────

function IosBanner() {
  if (!FEATURES.enableIosBanner) return null
  return (
    <div className="px-4 lg:px-8 py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="max-w-3xl mx-auto">
        <a
          href={IOS_APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-2xl p-6 transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, rgba(245,200,66,0.08) 0%, rgba(78,205,196,0.06) 100%)',
            border: '1px solid rgba(245,200,66,0.18)',
          }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,200,66,0.12)' }}>
            <Smartphone size={24} style={{ color: 'var(--sg-films)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-film-text leading-tight mb-1">GuessToday sur iOS</p>
            <p className="text-sm" style={{ color: 'rgba(236,233,226,0.5)' }}>
              Application native — notifications quotidiennes — gratuit sur iPhone &amp; iPad
            </p>
          </div>
          <AppStoreBadge className="shrink-0 h-10 w-auto" />
        </a>
      </div>
    </div>
  )
}

// ─── BelowFold — non connecté ─────────────────────────────────────────────────

function BelowFoldGuest({ friends, friendsLoading }: { friends: FriendEntry[]; friendsLoading: boolean }) {
  const { open: openAuth } = useAuthModal()

  return (
    <div style={{ background: '#0b0b1a' }}>
      {/* ── Comment ça marche ── */}
      <div className="px-4 lg:px-8 py-10 lg:py-14" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgba(236,233,226,0.35)' }}>
            Comment ça marche
          </p>
          <h2 className="font-title font-bold text-film-text mb-8" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>
            Un défi quotidien.<br />Cinéma, séries, personnalités.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: '01', title: 'Une énigme par jour', desc: 'Extrait de film, scène de série ou profil de personnalité célèbre — un nouveau défi chaque jour à minuit (Paris).', color: 'var(--sg-films)' },
              { n: '02', title: 'Indices progressifs', desc: 'Chaque mauvaise réponse ou passe débloque un indice supplémentaire : année, réalisateur, acteur, genre…', color: 'var(--sg-series)' },
              { n: '03', title: '5 tentatives max', desc: "Trouve le titre ou la personnalité avant d'épuiser tes essais. Partage ton score avec tes amis.", color: 'var(--sg-wiki)' },
            ].map(({ n, title, desc, color }) => (
              <div key={n} className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="font-mono font-bold text-lg leading-none" style={{ color }}>{n}</span>
                <p className="font-semibold text-film-text text-sm leading-snug">{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(236,233,226,0.5)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Joue avec tes amis — pitch ── */}
      <div className="px-4 lg:px-8 py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1">
              <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgba(236,233,226,0.35)' }}>Mode multijoueur</p>
              <h2 className="font-title font-bold text-film-text mb-3" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>Joue avec tes amis</h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(236,233,226,0.5)' }}>
                Crée un compte gratuit, ajoute tes amis par code, et compare vos résultats chaque jour. Classement mondial disponible.
              </p>
              <div className="flex gap-1.5 mb-5" aria-hidden>
                {['var(--sg-films)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.12)'].map((bg, i) => (
                  <div key={i} className="w-7 h-7 rounded-md" style={{ background: bg }} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all"
                style={{ background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--color-film-text)' }}
              >
                Créer un compte gratuit →
              </button>
            </div>
            <div className="w-full lg:w-72 shrink-0">
              <FriendsSidebar friends={friends} loading={friendsLoading} />
            </div>
          </div>
        </div>
      </div>

      <IosBanner />
    </div>
  )
}

// ─── BelowFold — connecté ─────────────────────────────────────────────────────

function BelowFoldUser({ friends, friendsLoading }: { friends: FriendEntry[]; friendsLoading: boolean }) {
  const film = loadStats('film')
  const wiki = FEATURES.enableWiki ? loadStats('wiki') : { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 }
  const series = FEATURES.enableSeries ? loadStats('series') : { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 }

  const total = film.gamesPlayed + wiki.gamesPlayed + series.gamesPlayed
  const wins = film.gamesWon + wiki.gamesWon + series.gamesWon
  const streak = Math.max(film.currentStreak, wiki.currentStreak, series.currentStreak)
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0

  return (
    <div style={{ background: '#0b0b1a' }}>
      {/* ── Barre de stats personnelle ── */}
      {total > 0 && (
        <div className="px-4 lg:px-8 py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-3 divide-x rounded-2xl overflow-hidden" style={{ background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.07)', divideColor: 'rgba(255,255,255,0.07)' }}>
              {[
                { value: String(total), label: 'Joués' },
                { value: `${pct}%`, label: 'Victoires' },
                { value: streak > 0 ? `🔥 ${streak}j` : '—', label: 'Série' },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center justify-center py-4 gap-1">
                  <span className="font-title font-bold text-xl text-gradient-gold leading-none">{value}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(236,233,226,0.4)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Amis ── */}
      <div className="px-4 lg:px-8 py-8" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(236,233,226,0.35)' }}>Tes amis aujourd'hui</p>
            <a href="/friends" className="text-xs font-medium" style={{ color: 'rgba(236,233,226,0.4)' }}>Voir tout →</a>
          </div>
          <FriendsSidebar friends={friends} loading={friendsLoading} />
        </div>
      </div>

      <IosBanner />
    </div>
  )
}

// ─── BelowFold — router ───────────────────────────────────────────────────────

function BelowFold({ friends, friendsLoading }: { friends: FriendEntry[]; friendsLoading: boolean }) {
  const user = useAuthStore((s) => s.user)
  if (user) return <BelowFoldUser friends={friends} friendsLoading={friendsLoading} />
  return <BelowFoldGuest friends={friends} friendsLoading={friendsLoading} />
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

  const fetchMe = useAuthStore((s) => s.fetchMe)
  const user = useAuthStore((s) => s.user)

  const today = getTodayParis()
  const localFilm = loadHistory('film')[today] ?? null
  const localSeries = loadHistory('series')[today] ?? null
  const localWiki = loadHistory('wiki')[today] ?? null
  const filmStatus: TodayStatus = serverToday?.film ?? localFilm
  const seriesStatus: TodayStatus = serverToday?.series ?? localSeries
  const wikiStatus: TodayStatus = serverToday?.wiki ?? localWiki

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
      else if (FEATURES.enableWiki) setAnnouncementVariant('wiki')
      setShowNewBadge(true)
    } catch {}
  }, [])

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0b0b1a' }}>
      <HomeHeader />

      {/* 3 cartes : ~62dvh mobile pour peek, hauteur fixe desktop */}
      <div className="grid grid-rows-3 lg:grid-rows-1 lg:grid-cols-3 h-[62dvh] lg:h-auto lg:min-h-[520px] lg:max-h-[600px]">
        <GameCard
          href="/films"
          icon={<Film />}
          modeLabel="Films"
          description="Identifie le film du jour à partir d'une scène et d'indices"
          accentColor="var(--sg-films)"
          todayStatus={filmStatus}
        />

        {FEATURES.enableSeries ? (
          <GameCard
            href="/series"
            icon={<Tv />}
            modeLabel="Séries"
            description="Identifie la série du jour à partir d'une scène et d'indices"
            accentColor="var(--sg-series)"
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
            disabled
          />
        )}
      </div>

      {/* Below fold : stats + amis + iOS banner */}
      <BelowFold friends={friends} friendsLoading={friendsLoading} />

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
