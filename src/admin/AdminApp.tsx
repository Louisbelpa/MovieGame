/**
 * admin/AdminApp.tsx
 * Root component for the admin back office.
 * Uses React Router DOM (BrowserRouter) for routing within /admin/*.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './hooks/useToast'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { FilmsPage } from './pages/FilmsPage'
import { SeriesPage } from './pages/SeriesPage'
import { CalendarPage } from './pages/CalendarPage'
import { ChangelogPage } from './pages/ChangelogPage'
import { ImportPage } from './pages/ImportPage'
import { LogsPage } from './pages/LogsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { WikiPersonsPage } from './pages/WikiPersonsPage'
import { WikiPrefetchPoolPage } from './pages/WikiPrefetchPoolPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'

export function AdminApp() {
  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/films" element={<FilmsPage />} />
        <Route path="/admin/series" element={<SeriesPage />} />
        <Route path="/admin/calendar" element={<CalendarPage />} />
        <Route path="/admin/changelog" element={<ChangelogPage />} />
        <Route path="/admin/import" element={<ImportPage />} />
        <Route path="/admin/logs" element={<LogsPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/wiki" element={<WikiPersonsPage />} />
        <Route path="/admin/wiki-pool" element={<WikiPrefetchPoolPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        {/* Fallback: redirect unknown /admin/* to dashboard */}
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}
