import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { AdminLayout } from '../components/AdminLayout'
import {
  getWikiPrefetchPool,
  getWikiPrefetchSettings,
  setWikiPrefetchSettings,
  type WikiPrefetchPoolEntry,
} from '../api'

function statusBadge(status: WikiPrefetchPoolEntry['status']): string {
  if (status === 'ready') return 'bg-emerald-100 text-emerald-700'
  if (status === 'processing') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function formatExpiry(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '-'
  return new Date(ms).toLocaleString()
}

export function WikiPrefetchPoolPage() {
  const [entries, setEntries] = useState<WikiPrefetchPoolEntry[]>([])
  const [stats, setStats] = useState({ processing: 0, ready: 0, failed: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [minFame, setMinFame] = useState(30)
  const [enabled, setEnabled] = useState(true)
  const [toggling, setToggling] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([getWikiPrefetchPool(lang, minFame, 150), getWikiPrefetchSettings()])
      .then(([data, settings]) => {
        setEntries(data.entries)
        setStats(data.stats)
        setEnabled(settings.enabled)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur chargement pool'))
      .finally(() => setLoading(false))
  }, [lang, minFame])

  useEffect(() => {
    load()
  }, [load])

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Langue</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as 'fr' | 'en')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">minFame</label>
          <input
            type="number"
            min={5}
            max={100}
            value={minFame}
            onChange={(e) => setMinFame(Math.max(5, Math.min(100, parseInt(e.target.value || '30', 10))))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 sm:ml-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
        <button
          onClick={async () => {
            setToggling(true)
            setError(null)
            try {
              const next = !enabled
              await setWikiPrefetchSettings(next)
              setEnabled(next)
              if (!next) {
                setEntries([])
                setStats({ processing: 0, ready: 0, failed: 0, total: 0 })
              } else {
                load()
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Erreur mise à jour statut pool')
            } finally {
              setToggling(false)
            }
          }}
          disabled={toggling}
          className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
            enabled
              ? 'text-red-700 bg-red-50 hover:bg-red-100'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          {enabled ? 'Désactiver le pool' : 'Activer le pool'}
        </button>
      </div>

      <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-700'
      }`}>
        Pool Wikipedia: <strong>{enabled ? 'Actif' : 'Inactif'}</strong>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3"><div className="text-xs text-gray-500">Total</div><div className="text-xl font-semibold">{stats.total}</div></div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3"><div className="text-xs text-gray-500">Ready</div><div className="text-xl font-semibold text-emerald-700">{stats.ready}</div></div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3"><div className="text-xs text-gray-500">Processing</div><div className="text-xl font-semibold text-amber-700">{stats.processing}</div></div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3"><div className="text-xs text-gray-500">Failed</div><div className="text-xl font-semibold text-red-700">{stats.failed}</div></div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-36 flex items-center justify-center text-sm text-gray-500">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="h-36 flex items-center justify-center text-sm text-gray-400">Aucune entrée actuellement dans le pool.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3">Slug source</th>
                  <th className="px-3 py-3">Slug résolu</th>
                  <th className="px-3 py-3">Expire le</th>
                  <th className="px-3 py-3">MAJ</th>
                  <th className="px-3 py-3">Erreur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{entry.source_slug}</td>
                    <td className="px-3 py-2 font-mono text-xs">{entry.resolved_slug ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{formatExpiry(entry.expires_at)}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{entry.updated_at}</td>
                    <td className="px-3 py-2 text-xs text-red-600">{entry.error_message ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
