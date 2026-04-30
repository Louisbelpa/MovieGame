/**
 * admin/components/AdminLayout.tsx
 * Shared sidebar + header layout for all admin pages.
 * Responsive: sidebar collapses to a hamburger menu on mobile.
 */

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Film, Tv, Calendar, LayoutDashboard, LogOut, Menu, X, ScrollText, Upload, ShieldAlert } from 'lucide-react'
import { adminLogout } from '../api'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/films', label: 'Films', icon: Film, exact: false },
  { to: '/admin/series', label: 'Séries', icon: Tv, exact: false },
  { to: '/admin/calendar', label: 'Planning', icon: Calendar, exact: false },
  { to: '/admin/import', label: 'Import CSV', icon: Upload, exact: false },
  { to: '/admin/changelog', label: 'Changelog', icon: ScrollText, exact: false },
  { to: '/admin/logs', label: 'Activité', icon: ShieldAlert, exact: false },
]

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    try { await adminLogout() } catch { /* ignore */ }
    navigate('/admin/login')
  }

  function isActive(item: (typeof navItems)[0]) {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  const currentLabel = navItems.find((n) => isActive(n))?.label ?? 'Admin'

  function NavContent() {
    return (
      <>
        <div className="px-6 py-5 border-b border-gray-700">
          <span className="font-bold text-lg tracking-tight">CinéGuessr</span>
          <span className="ml-2 text-xs text-gray-400 uppercase tracking-widest">Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                ].join(' ')}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <LogOut size={17} />
            Déconnexion
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 bg-gray-900 text-white flex-col">
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-200 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <span className="font-bold text-base">CinéGuessr Admin</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                ].join(' ')}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <LogOut size={17} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base lg:text-lg font-semibold text-gray-800">{currentLabel}</h1>
          </div>
          <span className="text-sm text-gray-400 hidden sm:block">Back office</span>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  )
}
