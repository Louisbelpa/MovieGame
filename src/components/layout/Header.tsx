import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'
import { avatarBg, avatarShadow, parseAvatarHue } from '@/lib/utils'

interface HeaderProps {
  mode: 'film' | 'series' | 'wiki'
}

export function Header({ mode: _mode }: HeaderProps) {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()

  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    FEATURES.enableWiki   ? loadStats('wiki').currentStreak   : 0,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  return (
    <header className="cdy-nav">
      {/* Logo */}
      <a href="/" className="cdy-logo" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
        <span className="cdy-die">?</span>
        <span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
      </a>

      {/* Navlinks (desktop only) */}
      <nav className="cdy-navlinks hidden lg:flex">
        <a href="/"        className="cdy-navlink on">Jeux du jour</a>
        <a href="/profile" className="cdy-navlink">Stats</a>
        <a href="/classement" className="cdy-navlink">Classement</a>
        <a href="/friends"    className="cdy-navlink">Amis</a>
      </nav>

      <span className="cdy-spacer" />

      {/* Right — authenticated: streak + avatar; non-auth desktop: Se connecter + S'inscrire; non-auth mobile: hidden (auth via page CTAs) */}
      {isLoading ? (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--line)' }} />
      ) : user ? (
        <>
          {maxStreak > 0 && (
            <span className="cdy-streak">🔥 {maxStreak}j</span>
          )}
          <a
            href="/profile"
            className="cdy-avatar"
            style={{ background: avatarBg(user.avatarUrl), boxShadow: avatarShadow(user.avatarUrl), textDecoration: 'none', fontSize: 14 }}
          >
            {user.avatarUrl && !parseAvatarHue(user.avatarUrl) ? (
              <img src={user.avatarUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              user.displayName.charAt(0).toUpperCase()
            )}
          </a>
        </>
      ) : (
        <>
          {/* Mobile: compact primary CTA */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="cdy-btn cdy-btn-primary g-film"
              style={{ padding: '9px 14px', fontSize: 13.5 }}
            >
              Créer un compte
            </button>
          </div>
          {/* Desktop: Se connecter + Créer un compte */}
          <div className="cdy-nav-auth hidden lg:flex" style={{ gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="cdy-navlink"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Fredoka, sans-serif' }}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="cdy-btn cdy-btn-primary g-film"
              style={{ padding: '10px 20px', fontSize: 14 }}
            >
              Créer un compte
            </button>
          </div>
        </>
      )}
    </header>
  )
}
