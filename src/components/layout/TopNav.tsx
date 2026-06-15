import { Link, useLocation } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'
import { avatarBg, avatarShadow, parseAvatarHue } from '@/lib/utils'

export function TopNav() {
  const user      = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const location  = useLocation()
  const path      = location.pathname

  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    loadStats('wiki').currentStreak,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  const initial = user?.displayName.charAt(0).toUpperCase()

  const navLinks = [
    { href: '/',            label: 'Jeux du jour', active: path === '/' },
    { href: '/stats',       label: 'Stats',        active: path === '/stats' },
    { href: '/classement',  label: 'Classement',   active: path === '/classement' },
    { href: '/friends',     label: 'Amis',         active: path === '/friends' },
  ]

  return (
    <header className="cdy-nav" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
      {/* Logo */}
      <Link to="/" className="cdy-logo" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
        <span className="cdy-die">?</span>
        <span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
      </Link>

      {/* Nav links (desktop only) */}
      <nav className="cdy-navlinks hidden lg:flex">
        {navLinks.map(({ href, label, active }, i) => (
          <Link key={i} to={href} className={`cdy-navlink${active ? ' on' : ''}`} style={{ textDecoration: 'none' }}>
            {label}
          </Link>
        ))}
      </nav>

      <span className="cdy-spacer" />

      {/* Right */}
      {isLoading ? (
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--line)' }} />
      ) : user ? (
        <div className="flex items-center gap-3">
          {maxStreak > 0 && (
            <span className="cdy-streak">
              <Flame size={14} aria-hidden /> {maxStreak}j
            </span>
          )}
          <Link
            to="/profile"
            className="cdy-avatar"
            aria-label={`Profil de ${user.displayName}`}
            style={{ background: avatarBg(user.avatarUrl), boxShadow: avatarShadow(user.avatarUrl), textDecoration: 'none', fontSize: 14 }}
          >
            {user.avatarUrl && !parseAvatarHue(user.avatarUrl) ? (
              <img src={user.avatarUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              initial
            )}
          </Link>
        </div>
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
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="cdy-navlink"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Fredoka, sans-serif', fontSize: 15 }}
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
