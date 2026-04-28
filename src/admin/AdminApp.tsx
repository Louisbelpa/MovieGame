/**
 * admin/AdminApp.tsx
 * Root component for the admin back office.
 * Uses React Router DOM (BrowserRouter) for routing within /admin/*.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { FilmsPage } from './pages/FilmsPage'
import { CalendarPage } from './pages/CalendarPage'
import { ChangelogPage } from './pages/ChangelogPage'
import { ImportPage } from './pages/ImportPage'

export function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/films" element={<FilmsPage />} />
        <Route path="/admin/calendar" element={<CalendarPage />} />
        <Route path="/admin/changelog" element={<ChangelogPage />} />
        <Route path="/admin/import" element={<ImportPage />} />
        {/* Fallback: redirect unknown /admin/* to dashboard */}
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
