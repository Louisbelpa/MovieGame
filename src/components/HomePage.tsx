import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Film, Tv, User, Smartphone, UserRound } from 'lucide-react'
import { ApertureIcon } from '@/components/ui/ApertureIcon'
import { Footer } from '@/components/layout/Footer'
import { AuthModal, useAuthModal } from '@/components/modals/AuthModal'
import { FEATURES, IOS_APP_STORE_URL } from '@/config/features'
import { useUiPrefsStore } from '@/store/uiPrefsStore'
import { useAuthStore } from '@/store/authStore'
import { loadStats, loadHistory, setHistoryEntry } from '@/lib/storage'
import { friendsGetAll, fetchChallenge, authGetStats, fetchGlobalStats, fetchChallengeCommunityStats, type FriendEntry } from '@/api/client'
import { fetchWikiChallenge } from '@/api/wikiClient'
import { FriendsSidebar } from '@/components/home/FriendsSidebar'
import {
  NewModesAnnouncementModal,
  NEW_MODES_ANNOUNCEMENT_STORAGE_KEY,
  type NewModesAnnouncementVariant,
} from '@/components/modals/NewModesAnnouncementModal'
import { MockDataBanner } from '@/components/dev/MockDataBanner'
import { isMockEnabled } from '@/mock/mockFlags'
import { MOCK_FRIENDS_RESPONSE } from '@/mock/mockData'

// ─── Helpers ──────────────────────────────────────────────────────────────────


function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
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

      {/* Centre : countdown */}
      {countdown && (
        <div className="flex flex-col items-center leading-none gap-0.5">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(236,233,226,0.4)' }}>Prochain jeu</span>
          <span className="text-base font-mono font-bold" style={{ color: '#ece9e2' }}>{countdown}</span>
        </div>
      )}

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
          className="btn-cta-register flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#ece9e2', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <UserRound size={14} aria-hidden />
          <span className="hidden sm:inline">Se connecter</span>
        </button>
      )}
    </header>
  )
}

// ─── ExplainerBand ────────────────────────────────────────────────────────────

function ExplainerBand() {
  return (
    <section
      style={{
        padding: '18px 24px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Tagline */}
      <p
        style={{
          fontFamily: "'Fraunces', serif",
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 'clamp(18px, 2.2vw, 24px)',
          background: 'linear-gradient(180deg, #f5d570, #b8852e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '14px',
        }}
      >
        5 essais. 3 indices. 1 défi par jour.
      </p>

      {/* Pill bar */}
      <div
        style={{
          display: 'inline-flex',
          background: '#161c2f',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '999px',
          padding: '10px 22px',
          gap: '32px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
        className="pill-steps"
      >
        {[
          { color: '#f5d358', bg: 'rgba(245,211,88,0.14)', num: '1', text: <>Tu vois une <strong style={{ color: '#f5d358' }}>scène floutée</strong></> },
          { color: '#4ad6c0', bg: 'rgba(74,214,192,0.14)', num: '2', text: <>Chaque erreur <strong style={{ color: '#4ad6c0' }}>débloque un indice</strong></> },
          { color: '#ff5a8a', bg: 'rgba(255,90,138,0.14)', num: '3', text: <>Trouve avant la <strong style={{ color: '#ff5a8a' }}>5ᵉ tentative</strong></> },
        ].map((step, i, arr) => (
          <React.Fragment key={step.num}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Bullet */}
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: step.bg,
                  color: step.color,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: '9.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.num}
              </span>
              <span style={{ fontSize: '13px', color: 'rgba(232,234,237,0.75)', whiteSpace: 'nowrap' }}>
                {step.text}
              </span>
            </div>
            {/* Vertical separator */}
            {i < arr.length - 1 && (
              <span
                style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch', flexShrink: 0 }}
                className="hidden lg:block"
                aria-hidden
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .pill-steps {
            flex-direction: column !important;
            gap: 12px !important;
            border-radius: 14px !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </section>
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
  imageUrl?: string | null
  challengeNumber?: number
  liveTicker?: { count: number; avgAttempts: number }
  hintSnippets?: string[]
}

function GameCard({ href, icon, modeLabel, description, accentColor, disabled, badge, todayStatus, imageUrl, challengeNumber, liveTicker, hintSnippets }: GameCardProps) {
  const showPlay = !todayStatus && !disabled
  const Tag = disabled ? 'div' : 'a'
  const [spot, setSpot] = useState({ x: 50, y: 50, on: false })
  const newDesign = useUiPrefsStore((s) => s.newDesign)

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    const r = e.currentTarget.getBoundingClientRect()
    setSpot({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, on: true })
  }
  const handleMouseLeave = () => setSpot(p => ({ ...p, on: false }))

  return (
    <Tag
      {...(!disabled ? { href } : {})}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`game-card group relative flex flex-col justify-between p-4 sm:p-5 lg:p-8 overflow-hidden transition-all duration-300 min-h-[220px] lg:min-h-0 ${
        disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'
      }`}
      style={{
        background: '#13132b',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Image floue en fond — preview du défi du jour */}
      {imageUrl && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{ opacity: 0.18 }}
        >
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
            style={{ filter: 'blur(12px)', transform: 'scale(1.08)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(19,19,43,0.3) 0%, rgba(19,19,43,0.85) 100%)' }} />
        </div>
      )}

      {/* Dégradé accent depuis le coin bas-droit */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 100% 80% at 110% 120%, ${accentColor}40, transparent 55%)`,
        }}
      />

      {/* Spotlight souris */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 200px at ${spot.x}% ${spot.y}%, rgba(255,255,255,0.06), transparent 70%)`,
          opacity: spot.on ? 1 : 0,
        }}
      />

      {/* #02 — New design: challenge image preview (above icon row) */}
      {newDesign && imageUrl && (
        <div className="relative overflow-hidden rounded-xl mb-3" style={{ aspectRatio: '16/10', border: `1px solid ${accentColor}4d`, boxShadow: `0 0 0 2px ${accentColor}24` }}>
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
            style={{ filter: 'blur(7px)', transform: 'scale(1.05)' }}
          />
          <div className="absolute inset-0" style={{ backdropFilter: 'blur(7px)' }} />
          {challengeNumber && (
            <span
              className="absolute bottom-2 right-2 font-mono font-bold text-xs px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)' }}
            >
              #{challengeNumber}
            </span>
          )}
        </div>
      )}
      {newDesign && !imageUrl && hintSnippets && hintSnippets.length > 0 && (
        <div
          className="relative overflow-hidden rounded-xl mb-3 flex flex-col justify-center gap-1.5 p-3"
          style={{ aspectRatio: '16/10', background: '#161c2f', border: `1px solid ${accentColor}30` }}
        >
          {/* Silhouette SVG */}
          <div className="flex justify-center mb-1">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="4" fill={`${accentColor}50`} />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill={`${accentColor}50`} />
            </svg>
          </div>
          {hintSnippets.slice(0, 3).map((snippet, i) => (
            <span key={i} className="text-[10px] text-center truncate" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(159,163,173,0.6)' }}>
              {snippet}
            </span>
          ))}
        </div>
      )}

      {/* Haut : icône + badge */}
      <div className="relative flex items-start justify-between">
        <div
          className="p-2.5 lg:p-3 rounded-2xl"
          style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}30` }}
        >
          {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 22 })}
        </div>

        {/* #02 — New design: live ticker */}
        {newDesign && liveTicker && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'JetBrains Mono', monospace", fontSize: '8.5px', color: 'rgba(159,163,173,0.7)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4cb078', display: 'inline-block', animation: 'pulse 2s infinite' }} aria-hidden />
            {liveTicker.count} joueurs · {liveTicker.avgAttempts.toFixed(1)} essais en moy.
          </span>
        )}

        {todayStatus === 'won' && (
          <span
            className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)' }}
          >
            <CheckCircle2 size={9} /> Gagné
          </span>
        )}
        {todayStatus === 'lost' && (
          <span
            className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(230,57,70,0.2)', color: '#e63946', border: '1px solid rgba(230,57,70,0.35)' }}
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
          className="font-title font-black text-white leading-none mb-2"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 3.8rem)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
        >
          {modeLabel}
        </p>
        <p className="text-sm mb-4 line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {description}
        </p>

        {showPlay ? (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 group-hover:scale-105"
            style={{ background: accentColor, color: '#0b0b1a', boxShadow: `0 4px 20px ${accentColor}40` }}
          >
            Jouer →
          </div>
        ) : todayStatus === 'won' ? (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)' }}
          >
            <CheckCircle2 size={14} /> Terminé
          </div>
        ) : todayStatus === 'lost' ? (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(230,57,70,0.15)', color: '#e63946', border: '1px solid rgba(230,57,70,0.3)' }}
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
            Comment jouer
          </p>
          <h2 className="font-title font-black text-film-text mb-8" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.02em' }}>
            Simple. Addictif. Quotidien.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: '01', emoji: '🎬', title: 'Une image mystère', desc: 'Chaque jour à minuit, une nouvelle image floue t\'attend. Film, série ou personnalité — à toi de deviner.' },
              { n: '02', emoji: '💡', title: 'Des indices se débloquent', desc: 'Chaque mauvaise réponse révèle un nouvel indice : année, réalisateur, acteur, genre… L\'image se précise.' },
              { n: '03', emoji: '🏆', title: '5 essais, pas plus', desc: 'Trouve avant le game over. Compare ton score avec tes amis. Recommence demain avec un nouveau défi.' },
            ].map(({ n, emoji, title, desc }) => (
              <div key={n} className="relative rounded-2xl p-5 flex flex-col gap-3 overflow-visible" style={{ background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span
                  className="absolute font-mono font-black leading-none select-none pointer-events-none"
                  style={{ top: 0, left: 0, transform: 'translate(-18%, -40%)', fontSize: 'clamp(4rem, 8vw, 6rem)', color: 'rgba(236,233,226,0.06)', letterSpacing: '-0.04em' }}
                >{n}</span>
                <span className="text-2xl leading-none">{emoji}</span>
                <p className="font-bold text-film-text text-sm leading-snug">{title}</p>
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
                className="btn-cta-register inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-200"
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
  const localFilm = loadStats('film')
  const localWiki = FEATURES.enableWiki ? loadStats('wiki') : { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 }
  const localSeries = FEATURES.enableSeries ? loadStats('series') : { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 }

  const [serverStats, setServerStats] = useState<{ total: number; wins: number; streak: number } | null>(null)

  useEffect(() => {
    const modes: Array<'film' | 'series' | 'wiki'> = ['film', ...(FEATURES.enableSeries ? ['series' as const] : []), ...(FEATURES.enableWiki ? ['wiki' as const] : [])]
    Promise.allSettled(modes.map(m => authGetStats(m))).then(results => {
      let total = 0, wins = 0, streak = 0
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          total += r.value.gamesPlayed
          wins += r.value.wins
          streak = Math.max(streak, r.value.currentStreak)
        }
      })
      if (total > 0) setServerStats({ total, wins, streak })
    }).catch(() => {})
  }, [])

  const localTotal = localFilm.gamesPlayed + localWiki.gamesPlayed + localSeries.gamesPlayed
  const localWins = localFilm.gamesWon + localWiki.gamesWon + localSeries.gamesWon
  const localStreak = Math.max(localFilm.currentStreak, localWiki.currentStreak, localSeries.currentStreak)

  const total = serverStats?.total ?? localTotal
  const wins = serverStats?.wins ?? localWins
  const streak = serverStats?.streak ?? localStreak
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0

  return (
    <div style={{ background: '#0b0b1a' }}>
      {/* ── Barre de stats personnelle ── */}
      {total > 0 && (
        <div className="px-4 lg:px-8 py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden" style={{ background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
  const newDesign = useUiPrefsStore((s) => s.newDesign)
  const [announcementVariant, setAnnouncementVariant] = useState<NewModesAnnouncementVariant | null>(null)
  const [showNewBadge, setShowNewBadge] = useState(false)
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [serverToday, setServerToday] = useState<{
    film: TodayStatus
    series: TodayStatus
    wiki: TodayStatus
  } | null>(null)
  const [imageUrls, setImageUrls] = useState<{ film?: string; series?: string; wiki?: string }>({})
  const [communityCount, setCommunityCount] = useState<number | null>(null)
  const [challengeIds, setChallengeIds] = useState<{ film?: number; series?: number; wiki?: number }>({})
  const [challengeNumbers, setChallengeNumbers] = useState<{ film?: number; series?: number; wiki?: number }>({})
  const [communityStats, setCommunityStats] = useState<Record<'film' | 'series' | 'wiki', { count: number; avgAttempts: number } | null>>({
    film: null, series: null, wiki: null,
  })

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

      // Capture image URLs for card previews
      setImageUrls({
        film: filmRes.status === 'fulfilled' ? filmRes.value.imageUrl : undefined,
        series: seriesRes.status === 'fulfilled' && seriesRes.value ? seriesRes.value.imageUrl : undefined,
        wiki: wikiRes.status === 'fulfilled' && wikiRes.value ? (wikiRes.value as { imageUrl?: string }).imageUrl : undefined,
      })

      // Capture challenge IDs and numbers for community stats
      setChallengeIds({
        film: filmRes.status === 'fulfilled' ? filmRes.value.challengeId : undefined,
        series: seriesRes.status === 'fulfilled' && seriesRes.value ? seriesRes.value.challengeId : undefined,
        wiki: wikiRes.status === 'fulfilled' && wikiRes.value ? (wikiRes.value as { challengeId?: number }).challengeId : undefined,
      })
      setChallengeNumbers({
        film: filmRes.status === 'fulfilled' ? filmRes.value.challengeNumber : undefined,
        series: seriesRes.status === 'fulfilled' && seriesRes.value ? seriesRes.value.challengeNumber : undefined,
      })

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
    if (isMockEnabled()) {
      setFriends(MOCK_FRIENDS_RESPONSE.friends)
      return
    }
    setFriendsLoading(true)
    friendsGetAll(today)
      .then((r) => setFriends(r.friends ?? []))
      .catch(() => {})
      .finally(() => setFriendsLoading(false))
  }, [user, today])

  // Fetch images for guests (no auth needed) + community stats
  useEffect(() => {
    if (user) return // handled by syncTodayFromServer
    Promise.allSettled([
      fetchChallenge('film'),
      FEATURES.enableWiki ? fetchWikiChallenge() : Promise.resolve(null),
      FEATURES.enableSeries ? fetchChallenge('series') : Promise.resolve(null),
    ]).then(([filmRes, wikiRes, seriesRes]) => {
      setImageUrls({
        film: filmRes.status === 'fulfilled' ? filmRes.value.imageUrl : undefined,
        wiki: wikiRes.status === 'fulfilled' && wikiRes.value ? (wikiRes.value as { imageUrl?: string }).imageUrl : undefined,
        series: seriesRes.status === 'fulfilled' && seriesRes.value ? seriesRes.value.imageUrl : undefined,
      })
      setChallengeIds({
        film: filmRes.status === 'fulfilled' ? filmRes.value.challengeId : undefined,
        wiki: wikiRes.status === 'fulfilled' && wikiRes.value ? (wikiRes.value as { challengeId?: number }).challengeId : undefined,
        series: seriesRes.status === 'fulfilled' && seriesRes.value ? seriesRes.value.challengeId : undefined,
      })
      setChallengeNumbers({
        film: filmRes.status === 'fulfilled' ? filmRes.value.challengeNumber : undefined,
        series: seriesRes.status === 'fulfilled' && seriesRes.value ? seriesRes.value.challengeNumber : undefined,
      })
    }).catch(() => {})
    fetchGlobalStats().then((s) => setCommunityCount(s.totalGames)).catch(() => {})
  }, [user])

  // #02 — Fetch community stats per mode for live ticker, refresh every 30s
  useEffect(() => {
    if (!newDesign) return
    const modes: Array<'film' | 'series' | 'wiki'> = ['film', ...(FEATURES.enableSeries ? ['series' as const] : []), ...(FEATURES.enableWiki ? ['wiki' as const] : [])]

    function fetchStats() {
      modes.forEach((m) => {
        const id = challengeIds[m]
        if (!id) return
        fetchChallengeCommunityStats(id).then((s) => {
          const totalWins = s.totalWins
          const totalPlayed = s.totalGames
          if (totalPlayed === 0) return
          const avgAttempts = totalWins > 0
            ? Object.entries(s.winsByAttempt).reduce((sum, [k, v]) => sum + Number(k) * v, 0) / Math.max(1, totalWins)
            : 0
          setCommunityStats((prev) => ({ ...prev, [m]: { count: totalPlayed, avgAttempts: Math.round(avgAttempts * 10) / 10 } }))
        }).catch(() => {})
      })
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [challengeIds])

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

      {/* #04 — Explainer band */}
      {newDesign && <ExplainerBand />}

      {/* Hero — titre + streak */}
      <div className="relative px-4 lg:px-8 pt-10 pb-6 lg:pt-16 lg:pb-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(245,200,66,0.14) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, #0b0b1a, transparent)' }} />
        </div>
        <div className="relative max-w-2xl mx-auto text-center flex flex-col items-center gap-3">
          {user && (() => {
            const maxStreak = Math.max(
              loadStats('film').currentStreak,
              FEATURES.enableWiki ? loadStats('wiki').currentStreak : 0,
              FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
            )
            return maxStreak > 0 ? (
              <div className="flex flex-col items-center gap-0.5">
                <p className="font-title font-black text-amber-400 animate-streak-bounce" style={{ fontSize: 'clamp(2.8rem, 8vw, 4.5rem)', lineHeight: 1, textShadow: '0 0 40px rgba(251,191,36,0.4)' }}>🔥 {maxStreak}</p>
                <p className="text-sm font-semibold text-amber-400/70 tracking-wide uppercase">jour{maxStreak > 1 ? 's' : ''} de suite</p>
              </div>
            ) : null
          })()}
          <h1 className="font-title font-black text-film-text" style={{ fontSize: 'clamp(2rem, 5.5vw, 3.6rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            {user ? 'Quel sera ton score aujourd\'hui ?' : 'Le quiz culture pop du jour'}
          </h1>
          <p className="text-sm lg:text-base max-w-md" style={{ color: 'rgba(236,233,226,0.5)' }}>
            Films · Séries · Personnalités — un nouveau défi chaque jour à minuit.
          </p>
          {communityCount && communityCount > 100 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex -space-x-1">
                {['#f5c842','#10b981','#ff6b9d'].map((c) => (
                  <div key={c} className="w-5 h-5 rounded-full border-2 border-film-black" style={{ background: c }} />
                ))}
              </div>
              <p className="text-xs font-semibold" style={{ color: 'rgba(236,233,226,0.5)' }}>
                <span className="text-film-text font-bold">{communityCount.toLocaleString('fr-FR')}</span> parties jouées
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3 cartes */}
      <div className="grid grid-rows-3 lg:grid-rows-1 lg:grid-cols-3 lg:min-h-[480px] lg:max-h-[580px]">
        <GameCard
          href="/films"
          icon={<Film />}
          modeLabel="Films"
          description="Identifie le film du jour à partir d'une scène et d'indices"
          accentColor="var(--sg-films)"
          todayStatus={filmStatus}
          imageUrl={imageUrls.film}
          challengeNumber={challengeNumbers.film}
          liveTicker={communityStats.film ?? undefined}
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
            imageUrl={imageUrls.series}
            challengeNumber={challengeNumbers.series}
            liveTicker={communityStats.series ?? undefined}
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
            imageUrl={imageUrls.wiki}
            liveTicker={communityStats.wiki ?? undefined}
          />
        ) : (
          <GameCard
            href="/wiki"
            icon={<User />}
            modeLabel="Personnalités"
            description="Devise une personnalité célèbre à partir d'indices sur sa carrière"
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

      <MockDataBanner />
    </div>
  )
}
