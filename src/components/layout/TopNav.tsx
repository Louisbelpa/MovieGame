import { Film, Tv, User, LogIn, Flame } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'
import { ApertureIcon } from '@/components/ui/ApertureIcon'

export function TopNav() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const initial = user?.displayName.charAt(0).toUpperCase()

  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    loadStats('wiki').currentStreak,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  return (
    <nav className="hidden lg:flex items-center justify-between w-full max-w-6xl mx-auto px-6 py-4 shrink-0">
      {/* Wordmark */}
      <a href="/" className="flex items-center gap-2 shrink-0">
        <ApertureIcon size={22} />
        <span className="font-title text-xl leading-none select-none">
          <span className="font-[500] text-film-text">Guess</span>
          <span className="italic font-[600] text-gradient-gold">today</span>
        </span>
      </a>

      {/* Mode tabs */}
      <div className="flex items-center gap-0.5">
        <a
          href="/films"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(212,166,74,0.12)', color: '#d4a64a' }}
        >
          <Film size={14} />
          Films
        </a>
        {FEATURES.enableSeries ? (
          <a
            href="/series"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-film-text-dim hover:text-film-text hover:bg-white/[0.05] transition-colors"
            style={{ color: 'var(--sg-series)' }}
          >
            <Tv size={14} />
            Séries
          </a>
        ) : null}
        {FEATURES.enableWiki ? (
          <a
            href="/wiki"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--sg-wiki)' }}
          >
            <User size={14} />
            Personnalités
          </a>
        ) : null}
      </div>

      {/* Right: streak + avatar */}
      <div className="flex items-center gap-3">
        {maxStreak > 0 && (
          <a
            href="/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-semibold text-amber-400 hover:bg-amber-500/15 transition-colors"
          >
            <Flame size={13} aria-hidden />
            {maxStreak} jour{maxStreak > 1 ? 's' : ''}
          </a>
        )}

        {isLoading ? (
          <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse" />
        ) : user ? (
          <a
            href="/profile"
            className="w-8 h-8 rounded-full bg-film-gold/20 border border-film-gold/40 flex items-center justify-center text-sm font-bold text-film-gold hover:bg-film-gold/30 transition-colors overflow-hidden shrink-0"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
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
      </div>
    </nav>
  )
}
