import { UserCircle, Users, LogIn, Flame, ChevronRight, CheckCircle2, XCircle, Film, Tv, Landmark } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Footer } from '@/components/layout/Footer'
import { AuthModal, useAuthModal } from '@/components/modals/AuthModal'
import { FEATURES } from '@/config/features'
import { useAuthStore } from '@/store/authStore'
import { loadStats, loadHistory, hasReturningFilmPlayerActivity } from '@/lib/storage'
import { friendsGetAll } from '@/api/client'
import { ApertureIcon } from '@/components/ui/ApertureIcon'
import {
  NewModesAnnouncementModal,
  NEW_MODES_ANNOUNCEMENT_STORAGE_KEY,
  type NewModesAnnouncementVariant,
} from '@/components/modals/NewModesAnnouncementModal'

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const initial = user?.displayName.charAt(0).toUpperCase()

  return (
    <header className="w-full max-w-2xl mx-auto flex items-center justify-between py-5 px-1">
      <div className="flex items-center gap-2.5">
        <ApertureIcon size={22} />
        <span className="font-title text-xl leading-none">
          <span className="font-[500] text-film-text">Guess</span>
          <span className="italic font-[600] text-gradient-gold">today</span>
        </span>
      </div>
      {isLoading ? (
        <div className="w-24 h-8 rounded-full bg-white/[0.04] animate-pulse" />
      ) : user ? (
        <a
          href="/profile"
          className="flex items-center gap-2 rounded-full border border-film-border bg-white/[0.04] hover:bg-white/[0.07] px-3 py-1.5 text-sm transition-colors"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-6 h-6 rounded-full object-cover border border-film-gold/40" />
          ) : (
            <span className="w-6 h-6 rounded-full bg-film-gold/20 border border-film-gold/40 flex items-center justify-center text-xs font-bold text-film-gold">
              {initial}
            </span>
          )}
          <span className="text-film-text font-medium max-w-[120px] truncate">{user.displayName}</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="flex items-center gap-1.5 rounded-full border border-film-border bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5 text-sm text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
        >
          <LogIn size={14} />
          Se connecter
        </button>
      )}
    </header>
  )
}

// ─── Game card ────────────────────────────────────────────────────────────────

interface GameCardProps {
  href: string
  icon: React.ReactElement
  title: string
  description: string
  label: string
  accentColor: string
  accentSoft: string
  accentRing: string
  disabled?: boolean
  badge?: string
  todayStatus?: 'won' | 'lost' | null
}

function GameCard({ href, icon, title, description, label, accentColor, accentSoft, accentRing, disabled, badge, todayStatus }: GameCardProps) {
  const Tag = disabled ? 'div' : 'a'
  return (
    <Tag
      {...(!disabled ? { href } : {})}
      className={`group relative flex flex-col rounded-2xl border p-6 sm:p-7 transition-all duration-200 ${
        disabled
          ? 'opacity-75 cursor-default'
          : 'cursor-pointer hover:scale-[1.015]'
      }`}
      style={{
        borderColor: todayStatus === 'won' ? 'rgba(34,197,94,0.4)' : todayStatus === 'lost' ? 'rgba(239,68,68,0.35)' : accentRing,
        background: `linear-gradient(135deg, ${accentSoft} 0%, transparent 60%)`,
        boxShadow: `0 0 0 1px ${todayStatus === 'won' ? 'rgba(34,197,94,0.4)' : todayStatus === 'lost' ? 'rgba(239,68,68,0.35)' : accentRing}, 0 12px 28px rgba(10,12,24,0.35)`,
      }}
    >
      {todayStatus && !disabled && (
        <span className="absolute top-3 right-3">
          {todayStatus === 'won'
            ? <CheckCircle2 size={18} className="text-film-green" />
            : <XCircle size={18} className="text-film-red/70" />}
        </span>
      )}
      {badge && !disabled && !todayStatus && (
        <span
          className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: accentSoft, color: accentColor, border: `1px solid ${accentRing}` }}
        >
          {badge}
        </span>
      )}

      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{ background: accentSoft }}
      >
        {icon}
      </div>

      <div className="flex-1">
        <p className="font-semibold text-film-text text-xl leading-tight">{title}</p>
        <p className="text-film-text-dim text-sm mt-2 leading-relaxed">{description}</p>
      </div>

      <p
        className="text-sm font-medium mt-5 transition-colors"
        style={{ color: disabled ? accentColor : accentColor }}
      >
        {disabled ? 'Bientôt disponible' : label}
      </p>
    </Tag>
  )
}

// ─── Account nudge (guest only) ───────────────────────────────────────────────

function AccountNudge() {
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()

  const filmStreak = loadStats('film').currentStreak
  const wikiStreak = loadStats('wiki').currentStreak
  const streak = Math.max(filmStreak, wikiStreak)

  if (user) return null

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 flex items-center justify-between gap-3 rounded-xl border border-film-border bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {streak > 0 ? (
          <>
            <Flame size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-film-text-dim truncate">
              Série de <strong className="text-film-text">{streak}</strong> jour{streak > 1 ? 's' : ''} — sauvegarde-la sur un compte gratuit.
            </p>
          </>
        ) : (
          <>
            <UserCircle size={16} className="text-film-text-dim/60 shrink-0" />
            <p className="text-sm text-film-text-dim">Jouez sans compte ou créez-en un pour sauvegarder vos stats.</p>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => openAuth('register')}
          className="text-xs font-semibold text-film-gold hover:underline cursor-pointer whitespace-nowrap"
        >
          Créer un compte
        </button>
      </div>
    </div>
  )
}

// ─── Friends quick-access (logged in only) ────────────────────────────────────

function FriendsRow() {
  const user = useAuthStore((s) => s.user)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    friendsGetAll().then((r) => setPendingCount(r.pending.length)).catch(() => {})
  }, [user])

  if (!user) return null

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <a
        href="/friends"
        className="group flex items-center gap-3 rounded-xl border border-film-border bg-white/[0.02] hover:bg-white/[0.04] px-4 py-3 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
          <Users size={15} className="text-film-text-dim group-hover:text-film-text transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-film-text-dim group-hover:text-film-text transition-colors">
            Scores de mes amis
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="min-w-[18px] h-[18px] rounded-full bg-film-gold text-film-black text-[10px] font-bold flex items-center justify-center px-1 shrink-0">
            {pendingCount}
          </span>
        )}
        <ChevronRight size={14} className="text-film-text-dim/40 group-hover:text-film-text-dim transition-colors" />
      </a>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

export function HomePage() {
  const [announcementVariant, setAnnouncementVariant] = useState<NewModesAnnouncementVariant | null>(null)
  const [showNewBadge, setShowNewBadge] = useState(false)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  const today = getTodayParis()
  const filmStatus = loadHistory('film')[today] ?? null
  const seriesStatus = loadHistory('series')[today] ?? null
  const wikiStatus = loadHistory('wiki')[today] ?? null

  useEffect(() => { void fetchMe() }, [fetchMe])

  useEffect(() => {
    try {
      if (localStorage.getItem(NEW_MODES_ANNOUNCEMENT_STORAGE_KEY)) return
      if (!hasReturningFilmPlayerActivity()) return
      if (FEATURES.enableSeries && FEATURES.enableWiki) setAnnouncementVariant('both')
      else if (FEATURES.enableSeries) setAnnouncementVariant('series')
      else if (FEATURES.enableWiki) setAnnouncementVariant('wiki')
      setShowNewBadge(true)
    } catch {}
  }, [])

  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(clamp(30rem, 48vw, 56rem) clamp(20rem, 34vw, 38rem) at 10% 6%, rgba(245,197,66,0.12), transparent 62%), radial-gradient(clamp(28rem, 46vw, 54rem) clamp(18rem, 32vw, 36rem) at 92% 78%, rgba(245,197,66,0.10), transparent 64%)',
        }}
      />

      <div className="flex-1 w-full relative">
        <TopBar />

        <div className="max-w-4xl mx-auto pb-12">
          {/* Hero */}
          <div className="text-center mb-10 mt-6">
            <span className="inline-block rounded-full border border-film-gold/25 bg-film-gold/[0.07] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-film-gold/75 mb-5">
              Défi quotidien
            </span>
            <h1 className="text-[1.65rem] font-bold text-film-text leading-tight tracking-tight mb-3">
              À toi de trouver
            </h1>
            <p className="text-film-text-dim text-sm max-w-xs mx-auto leading-relaxed">
              {FEATURES.enableWiki
                ? 'Une image ou un profil. 5 tentatives.\nDes indices dévoilés à chaque erreur.'
                : 'Une image. 5 tentatives. Des indices dévoilés à chaque erreur.'}
            </p>
          </div>

          {/* Game cards */}
          <div className={`grid gap-4 ${FEATURES.enableSeries || FEATURES.enableWiki ? 'sm:grid-cols-3' : ''}`}>
            <GameCard
              href="/films"
              icon={<Film size={28} style={{ color: '#8fb8f3' }} />}
              title="Mode Films"
              description="Chaque jour, devinez un film à partir d'une image en 5 tentatives, avec des indices qui se débloquent au fil de la partie."
              label="Jouer en mode Films"
              accentColor="#8fb8f3"
              accentSoft="rgba(77,142,232,0.20)"
              accentRing="rgba(77,142,232,0.30)"
              todayStatus={filmStatus}
            />

            {FEATURES.enableSeries ? (
              <GameCard
                href="/series"
                icon={<Tv size={28} style={{ color: '#7ad2b8' }} />}
                title="Mode Séries"
                description="Le même principe côté séries : une image, 5 tentatives, et des indices progressifs pour trouver le bon titre."
                label="Jouer en mode Séries"
                accentColor="#7ad2b8"
                accentSoft="rgba(30,176,136,0.20)"
                accentRing="rgba(30,176,136,0.28)"
                badge={showNewBadge ? 'Nouveau' : undefined}
                todayStatus={seriesStatus}
              />
            ) : (
              <GameCard
                href="/series"
                icon={<Tv size={28} style={{ color: '#7ad2b8' }} />}
                title="Mode Séries"
                description="Le mode Séries arrive bientôt. Le temps de compléter le catalogue."
                label="Bientôt"
                accentColor="#7ad2b8"
                accentSoft="rgba(30,176,136,0.10)"
                accentRing="rgba(30,176,136,0.18)"
                disabled
              />
            )}

            {FEATURES.enableWiki ? (
              <GameCard
                href="/wiki"
                icon={<Landmark size={28} style={{ color: '#c4b5fd' }} />}
                title="Personnalités"
                description="Devinez la personnalité du jour grâce à des indices progressifs tirés de sa biographie et carrière."
                label="Jouer en mode Personnalités"
                accentColor="#c4b5fd"
                accentSoft="rgba(139,92,246,0.20)"
                accentRing="rgba(139,92,246,0.28)"
                badge={showNewBadge ? 'Nouveau' : undefined}
                todayStatus={wikiStatus}
              />
            ) : (
              <GameCard
                href="/wiki"
                icon={<Landmark size={28} style={{ color: '#c4b5fd' }} />}
                title="Personnalités"
                description="Le mode Personnalités arrive bientôt. Le temps de finaliser le catalogue."
                label="Bientôt"
                accentColor="#c4b5fd"
                accentSoft="rgba(139,92,246,0.10)"
                accentRing="rgba(139,92,246,0.18)"
                disabled
              />
            )}
          </div>

          {/* Account nudge / friends row */}
          <AccountNudge />
          <FriendsRow />
        </div>
      </div>

      <Footer />
      <AuthModal />

      {announcementVariant && (
        <NewModesAnnouncementModal
          isOpen={true}
          onClose={() => setAnnouncementVariant(null)}
          variant={announcementVariant}
        />
      )}
    </div>
  )
}
