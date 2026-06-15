import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Tab = 'games' | 'stats' | 'friends' | 'profile'

const TABS: { id: Tab; to: string; label: string; icon: ReactNode }[] = [
  {
    id: 'games',
    to: '/films',
    label: 'Jeux',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="14" rx="3" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M9 12h6M12 9v6" />
      </svg>
    ),
  },
  {
    id: 'stats',
    to: '/stats',
    label: 'Stats',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
      </svg>
    ),
  },
  {
    id: 'friends',
    to: '/friends',
    label: 'Classement',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    to: '/profile',
    label: 'Profil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      </svg>
    ),
  },
]

export function MobileTabBar({ activeTab }: { activeTab: Tab }) {
  return (
    <nav className="cdym-tabs fixed bottom-0 left-0 right-0 z-30 lg:hidden">
      {TABS.map(({ id, to, label, icon }) => (
        <Link key={id} to={to} className={`cdym-tab ${activeTab === id ? 'on' : ''}`}>
          <span className="ic">{icon}</span>
          <span className="lb">{label}</span>
        </Link>
      ))}
    </nav>
  )
}
