import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, Loader2, Mail, MonitorCog, Puzzle } from 'lucide-react'
import { AdminLayout } from '../components/AdminLayout'
import {
  fetchAdminSettingsSummary,
  setWikiPrefetchSettings,
  type AdminSettingsSummary,
} from '../api'

export function SettingsPage() {
  const [summary, setSummary] = useState<AdminSettingsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingPrefetch, setSavingPrefetch] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return fetchAdminSettingsSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur chargement'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleWikiPrefetch() {
    if (!summary) return
    const next = !summary.wikiPrefetchEnabled
    setSavingPrefetch(true)
    setError(null)
    try {
      await setWikiPrefetchSettings(next)
      const s = await fetchAdminSettingsSummary()
      setSummary(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur enregistrement')
    } finally {
      setSavingPrefetch(false)
    }
  }

  return (
    <AdminLayout>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {loading || !summary ? (
        <div className="h-40 flex items-center justify-center text-gray-500 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin shrink-0" />
          Chargement…
        </div>
      ) : (
        <div className="space-y-5 max-w-3xl">
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-indigo-50/40">
              <Database size={18} className="text-indigo-700 shrink-0" aria-hidden />
              <h2 className="text-sm font-semibold text-gray-900">Wikipedia — préfetch (pool)</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Active ou coupe la génération automatique du pool utilisé par « Personnalité aléatoire » dans Personnalités.
                La liste du{' '}
                <Link to="/admin/wiki-pool" className="font-medium text-indigo-600 hover:underline">
                  Pool personnalités
                </Link>{' '}
                reste consultable ; désactivé, aucune nouvelle entrée n’est préchargée.
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 bg-gray-50/80 rounded-lg border border-gray-100 px-3 py-2">
                <div>
                  <dt className="text-gray-500">Objectif entrées ready</dt>
                  <dd className="font-mono text-gray-900">{summary.wikiPrefetchTargetReady}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Fetch Wikipédia / passe</dt>
                  <dd className="font-mono text-gray-900">{summary.wikiPrefetchMaxFetchPerRun}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Limite SPARQL Wikidata</dt>
                  <dd className="font-mono text-gray-900">{summary.wikiPrefetchSparqlLimit}</dd>
                </div>
              </dl>
              <p className="text-[11px] text-gray-500">
                Ces trois valeurs viennent du processus Node au démarrage (<code className="bg-gray-100 px-1 rounded">WIKI_PREFETCH_*</code>). Redémarre le backend après modification du <code className="bg-gray-100 px-1 rounded">.env</code>.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={savingPrefetch}
                  onClick={() => void toggleWikiPrefetch()}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    summary.wikiPrefetchEnabled
                      ? 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {savingPrefetch ? <Loader2 size={16} className="animate-spin" /> : null}
                  {summary.wikiPrefetchEnabled ? 'Désactiver le pool préfetch' : 'Activer le pool préfetch'}
                </button>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${summary.wikiPrefetchEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                  {summary.wikiPrefetchEnabled ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-slate-50/80">
              <MonitorCog size={18} className="text-slate-700 shrink-0" aria-hidden />
              <h2 className="text-sm font-semibold text-gray-900">Serveur (lecture seule)</h2>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Ces valeurs viennent du fichier <code className="bg-gray-100 px-1 rounded">.env</code> du backend et du déploiement.
                Pour les modifier, redémarre le serveur après changement.
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tentatives max — Films / séries</dt>
                  <dd className="font-mono text-gray-900 mt-0.5">{summary.maxAttempts}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tentatives max — Wiki</dt>
                  <dd className="font-mono text-gray-900 mt-0.5">{summary.wikiMaxAttempts}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Images jeu</dt>
                  <dd className="font-mono text-gray-900 mt-0.5">{summary.imageSource}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Environnement Node</dt>
                  <dd className="font-mono text-gray-900 mt-0.5">{summary.nodeEnv}</dd>
                </div>
                <div className="sm:col-span-2 flex items-start gap-2">
                  <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Alerte e-mail planning</dt>
                    <dd className="text-gray-900 mt-0.5">
                      {summary.planningAlertConfigured ? (
                        <span className="text-emerald-700 font-medium">Configurée (Resend + destinataires)</span>
                      ) : (
                        <span className="text-gray-600">
                          Non configurée ou désactivée (<code className="text-xs bg-gray-100 px-1 rounded">RESEND_API_KEY</code>, etc.)
                        </span>
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </section>

          <section className="bg-amber-50/60 rounded-xl border border-amber-200/80 px-4 py-3 flex gap-3">
            <Puzzle size={18} className="text-amber-800 shrink-0 mt-0.5" aria-hidden />
            <div className="text-xs text-amber-950/90 leading-relaxed space-y-2">
              <p className="font-medium text-amber-950">Frontend</p>
              <p>
                Les modes <strong>CinéGuessr / GuessToday</strong> et <strong>WikiGuessr</strong> dépendent des variables{' '}
                <code className="bg-white/80 px-1 rounded border border-amber-200/60">VITE_ENABLE_SERIES</code>,{' '}
                <code className="bg-white/80 px-1 rounded border border-amber-200/60">VITE_ENABLE_WIKI</code> au{' '}
                <strong>build</strong> du frontend — pas modifiables ici.
              </p>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  )
}
