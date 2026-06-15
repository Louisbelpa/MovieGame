import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'
import { avatarBg, avatarShadow, parseAvatarHue } from '@/lib/utils'

export type CandyNavKey = 'jeux' | 'stats' | 'classement' | 'amis'

const NAV_LINKS: { key: CandyNavKey; href: string; label: string }[] = [
  { key: 'jeux', href: '/', label: 'Jeux du jour' },
  { key: 'stats', href: '/stats', label: 'Stats' },
  { key: 'classement', href: '/classement', label: 'Classement' },
  { key: 'amis', href: '/friends', label: 'Amis' },
]

function activeKeyFromPath(path: string): CandyNavKey {
  if (path.startsWith('/stats')) return 'stats'
  if (path.startsWith('/classement')) return 'classement'
  if (path.startsWith('/friends')) return 'amis'
  return 'jeux'
}

export interface CandyNavProps {
  /** Onglet actif (sinon déduit de l’URL). */
  active?: CandyNavKey
  /** Burger mobile (hub / landing web). */
  onOpenMenu?: () => void
  sticky?: boolean
}

/** Barre de navigation desktop Candy — réplique de `CandyNav` (candy-screens.jsx). */
export function CandyNav({ active, onOpenMenu, sticky }: CandyNavProps) {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const location = useLocation()
  const activeKey = active ?? activeKeyFromPath(location.pathname)

  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    FEATURES.enableWiki ? loadStats('wiki').currentStreak : 0,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  const initial = user?.displayName.charAt(0).toUpperCase()

  return (
    <header className={`cdy-nav${sticky ? ' cdy-nav-sticky' : ''}`}>
      {onOpenMenu && (
        <button type="button" className="cdym-burger lg:hidden" aria-label="Menu" onClick={onOpenMenu}>
          <span /><span /><span />
        </button>
      )}

      <Link to="/" className="cdy-logo">
        <span className="cdy-die">?</span>
        <span>
          Guess<span className="cdy-logo-accent">Today</span>
        </span>
      </Link>

      {!isLoading && user && (
        <nav className="cdy-navlinks hidden lg:flex" aria-label="Navigation principale">
          {NAV_LINKS.map(({ key, href, label }) => (
            <Link key={key} to={href} className={`cdy-navlink${activeKey === key ? ' on' : ''}`}>
              {label}
            </Link>
          ))}
        </nav>
      )}

      <span className="cdy-spacer" aria-hidden />

      {isLoading ? (
        <div className="cdy-nav-skel" aria-hidden />
      ) : user ? (
        <>
          {maxStreak > 0 && (
            <span className="cdy-streak">🔥 {maxStreak}</span>
          )}
          <Link
            to="/profile"
            className="cdy-avatar"
            aria-label={`Profil de ${user.displayName}`}
            style={{ background: avatarBg(user.avatarUrl), boxShadow: avatarShadow(user.avatarUrl) }}
          >
            {user.avatarUrl && !parseAvatarHue(user.avatarUrl) ? (
              <img src={user.avatarUrl} alt="" />
            ) : (
              initial
            )}
          </Link>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => openAuth('register')}
            className="cdy-btn cdy-btn-primary g-film cdy-nav-cta-mobile"
          >
            Créer un compte
          </button>
          <div className="cdy-nav-auth-desktop">
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="cdy-navlink cdy-navlink-btn"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="cdy-btn cdy-btn-primary g-film"
            >
              Créer un compte
            </button>
          </div>
        </>
      )}
    </header>
  )
}
