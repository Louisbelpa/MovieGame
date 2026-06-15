import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { avatarBg, avatarShadow, parseAvatarHue } from '@/lib/utils'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

const LINKS = [
  { to: '/', label: 'Jeux du jour', icon: '🎮' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/classement', label: 'Classement', icon: '🏆' },
  { to: '/friends', label: 'Amis', icon: '👥' },
  { to: '/profile', label: 'Réglages', icon: '⚙️' },
] as const

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { open: openAuth } = useAuthModal()
  const navigate = useNavigate()

  if (!open) return null

  async function handleLogout() {
    onClose()
    await logout()
    navigate('/')
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" className="cdym-drawer-scrim" aria-label="Fermer" onClick={onClose} />
      <div className="cdym-drawer">
        <div className="cdym-drawer-top">
          {user ? (
            <>
              <span
                className="av"
                style={{ background: avatarBg(user.avatarUrl), boxShadow: avatarShadow(user.avatarUrl) }}
              >
                {user.avatarUrl && !parseAvatarHue(user.avatarUrl)
                  ? user.displayName.charAt(0).toUpperCase()
                  : user.displayName.charAt(0).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="n">{user.displayName}</div>
                <div className="u">{user.email ?? 'Compte GuessToday'}</div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1 }}>
              <div className="n">GuessToday</div>
              <div className="u">Connecte-toi pour jouer avec tes amis</div>
            </div>
          )}
          <button type="button" className="cdym-drawer-x" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {LINKS.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className={`cdym-drawer-link${to === '/' ? ' on' : ''}`}
          >
            <span className="ic">{icon}</span>
            {label}
          </Link>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '2.5px solid var(--line)' }}>
          {user ? (
            <button type="button" onClick={() => void handleLogout()} className="cdym-drawer-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-2)' }}>
              <span className="ic">↩</span>
              Se déconnecter
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onClose(); openAuth('register') }}
              className="cdy-btn cdy-btn-primary"
              style={{ width: '100%', padding: '14px' }}
            >
              Créer un compte
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
