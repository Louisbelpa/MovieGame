import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, ShieldAlert } from 'lucide-react'
import { AdminLayout } from '../components/AdminLayout'
import { getAuditLogs, getAuditLogActions, type AuditLog } from '../api'

// ─── Action badge ─────────────────────────────────────────────────────────────

const ACTION_STYLES: Record<string, string> = {
  'admin.login':       'bg-blue-50 text-blue-700 border-blue-200',
  'film.create':       'bg-green-50 text-green-700 border-green-200',
  'film.update':       'bg-amber-50 text-amber-700 border-amber-200',
  'film.delete':       'bg-red-50 text-red-700 border-red-200',
  'challenge.create':  'bg-green-50 text-green-700 border-green-200',
  'challenge.update':  'bg-amber-50 text-amber-700 border-amber-200',
  'challenge.delete':  'bg-red-50 text-red-700 border-red-200',
}

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] ?? 'bg-gray-100 text-gray-600 border-gray-300'
  return (
    <span className={`inline-block border rounded-md px-2 py-0.5 text-xs font-mono font-medium ${style}`}>
      {action}
    </span>
  )
}

// ─── Details renderer ─────────────────────────────────────────────────────────

function Details({ action, details }: { action: string; details: Record<string, unknown> }) {
  const parts: string[] = []

  if (action === 'admin.login') {
    parts.push(`utilisateur : ${details.username ?? '—'}`)
  } else if (action === 'film.create') {
    parts.push(`#${details.id} — ${details.title ?? ''}`)
  } else if (action === 'film.update') {
    const fields = Array.isArray(details.fields) ? (details.fields as string[]).join(', ') : ''
    parts.push(`#${details.id}`)
    if (fields) parts.push(`champs : ${fields}`)
  } else if (action === 'film.delete') {
    parts.push(`#${details.id}`)
  } else if (action === 'challenge.create') {
    parts.push(`#${details.id} — ${details.date ?? ''} → film #${details.film_id ?? ''}`)
  } else if (action === 'challenge.update') {
    parts.push(`#${details.id} → film #${details.film_id ?? ''}`)
  } else if (action === 'challenge.delete') {
    parts.push(`#${details.id}`)
  } else {
    parts.push(JSON.stringify(details))
  }

  return (
    <span className="text-sm text-gray-700 font-mono">
      {parts.join(' · ')}
    </span>
  )
}

// ─── Timestamp ────────────────────────────────────────────────────────────────

function Timestamp({ iso }: { iso: string }) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <span className="text-xs text-gray-500 whitespace-nowrap">
      {date} <span className="text-gray-400">{time}</span>
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export function LogsPage() {
  const [logs, setLogs]         = useState<AuditLog[]>([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [page, setPage]         = useState(1)
  const [actions, setActions]   = useState<string[]>([])
  const [filter, setFilter]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Load available action types for the filter dropdown (once)
  useEffect(() => {
    getAuditLogActions().then(setActions).catch(() => {})
  }, [])

  const load = useCallback(
    (p: number, actionFilter: string, showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      setError(null)

      getAuditLogs(p, PAGE_SIZE, actionFilter || undefined)
        .then((res) => {
          setLogs(res.data)
          setTotal(res.total)
          setPages(res.pages)
        })
        .catch((err) => setError((err as Error).message))
        .finally(() => { setLoading(false); setRefreshing(false) })
    },
    []
  )

  useEffect(() => { load(page, filter) }, [page, filter, load])

  function handleFilter(value: string) {
    setFilter(value)
    setPage(1)
  }

  function handleRefresh() {
    load(page, filter, true)
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Journal d'activité</h1>
              <p className="text-sm text-gray-500">{total} événement{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 shrink-0">Filtrer par action :</label>
          <select
            value={filter}
            onChange={(e) => handleFilter(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="">Toutes les actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <ShieldAlert className="w-8 h-8 opacity-40" />
              <p className="text-sm">Aucun événement{filter ? ` pour « ${filter} »` : ''}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium w-8">#</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.id}</td>
                    <td className="px-4 py-3"><Timestamp iso={log.created_at} /></td>
                    <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                    <td className="px-4 py-3"><Details action={log.action} details={log.details} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span className="text-gray-500">Page {page} / {pages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 shadow-sm"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
