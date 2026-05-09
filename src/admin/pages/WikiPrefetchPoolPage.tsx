import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Eye, Loader2, Plus, RefreshCw } from 'lucide-react'
import { AdminLayout } from '../components/AdminLayout'
import { WikiGamePreviewModal } from '../components/WikiGamePreviewModal'
import {
  addWikiPrefetchPoolEntry,
  getWikiPrefetchPool,
  getWikiPrefetchSettings,
  setWikiPrefetchSettings,
  type WikipediaFetchPayload,
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

const PERSON_TYPE_LABEL: Record<WikipediaFetchPayload['person_type'], string> = {
  politician: 'Politicien',
  sportsperson: 'Sportif',
  artist: 'Artiste',
  scientist: 'Scientifique',
  entrepreneur: 'Entrepreneur',
  writer: 'Écrivain',
  historical_figure: 'Figure historique',
  generic: 'Générique',
}

function WikiPoolPayloadPreview({ payload }: { payload: WikipediaFetchPayload }) {
  const infoboxStr = useMemo(
    () => JSON.stringify(payload.infobox_data ?? {}, null, 2),
    [payload.infobox_data]
  )
  const [showFullExtract, setShowFullExtract] = useState(false)
  const extract = payload.extract ?? ''
  const extractPreview = extract.length > 480 && !showFullExtract ? `${extract.slice(0, 480)}…` : extract

  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-wrap items-start gap-3">
        {payload.photo_url ? (
          <img
            src={payload.photo_url}
            alt=""
            className="h-24 w-24 shrink-0 rounded-lg object-cover border border-gray-200 bg-gray-100"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold text-gray-900">{payload.name}</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-800">
              {PERSON_TYPE_LABEL[payload.person_type] ?? payload.person_type}
            </span>
            {typeof payload.suggested_difficulty === 'number' ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                Difficulté suggérée {payload.suggested_difficulty}/5
              </span>
            ) : null}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
              Qualité parse {payload.parse_quality_score ?? '—'}
            </span>
          </div>
          <a
            href={payload.wikipedia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
          >
            Ouvrir Wikipédia <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {payload.hint_schedule?.length ? (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Ordre des indices</div>
          <div className="flex flex-wrap gap-1">
            {payload.hint_schedule.map((k) => (
              <code key={k} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800">
                {k}
              </code>
            ))}
          </div>
        </div>
      ) : null}

      {extract ? (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Extrait Wikipédia</div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{extractPreview}</p>
          {extract.length > 480 ? (
            <button
              type="button"
              onClick={() => setShowFullExtract(!showFullExtract)}
              className="mt-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              {showFullExtract ? 'Réduire' : 'Afficher tout'}
            </button>
          ) : null}
        </div>
      ) : null}

      {payload.parse_warnings?.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="font-medium mb-1">Avertissements parse</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {payload.parse_warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Infobox (JSON)
        </summary>
        <pre className="max-h-64 overflow-auto border-t border-gray-100 p-3 text-xs text-gray-800">{infoboxStr}</pre>
      </details>

      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Payload complet (debug)
        </summary>
        <pre className="max-h-80 overflow-auto border-t border-gray-100 p-3 text-xs text-gray-800">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>
    </div>
  )
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
  const [addInput, setAddInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [expandedPayloadId, setExpandedPayloadId] = useState<number | null>(null)
  const [wikiPreviewPoolEntryId, setWikiPreviewPoolEntryId] = useState<number | null>(null)

  const load = useCallback((): Promise<void> => {
    setLoading(true)
    setError(null)
    return Promise.all([getWikiPrefetchPool(lang, minFame, 150), getWikiPrefetchSettings()])
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
        Pool personnalités (préfetch) : <strong>{enabled ? 'Actif' : 'Inactif'}</strong>
      </div>

      <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Ajouter une personnalité au pool</h3>
        <p className="text-xs text-gray-500 mb-3">
          Même recherche que dans le formulaire Wikipédia : nom, slug, titre de page ou URL. Utilise la <strong>langue</strong> et le <strong>minFame</strong> sélectionnés ci-dessus (classement du pool). Si la fiche existe déjà pour cette combinaison, tu obtiens une erreur « déjà dans le pool ».
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <label htmlFor="pool-add-input" className="sr-only">Nom, slug ou URL Wikipédia</label>
            <input
              id="pool-add-input"
              type="text"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="ex. Élisabeth Borne ou https://fr.wikipedia.org/wiki/…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={adding || !enabled}
            />
          </div>
          <button
            type="button"
            disabled={adding || !enabled || !addInput.trim()}
            onClick={async () => {
              setAdding(true)
              setError(null)
              try {
                await addWikiPrefetchPoolEntry({ input: addInput.trim(), lang, minFame })
                setAddInput('')
                await load()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Échec ajout au pool')
              } finally {
                setAdding(false)
              }
            }}
            className="inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} aria-hidden />}
            {adding ? 'Récupération…' : 'Ajouter au pool'}
          </button>
        </div>
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
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3 whitespace-nowrap w-20">Parse</th>
                  <th className="px-3 py-3">Slug source</th>
                  <th className="px-3 py-3">Slug résolu</th>
                  <th className="px-3 py-3">Expire le</th>
                  <th className="px-3 py-3">MAJ</th>
                  <th className="px-3 py-3">Erreur</th>
                  <th className="px-3 py-3 whitespace-nowrap">Aperçu jeu</th>
                  <th className="px-3 py-3 w-28">Contenu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {entries.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(entry.status)}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 tabular-nums">
                        {entry.payload && typeof entry.payload.parse_quality_score === 'number'
                          ? `${Math.round(entry.payload.parse_quality_score)} %`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.source_slug}</td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.resolved_slug ?? '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{formatExpiry(entry.expires_at)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{entry.updated_at}</td>
                      <td className="px-3 py-2 text-xs text-red-600">{entry.error_message ?? '-'}</td>
                      <td className="px-3 py-2">
                        {entry.status === 'ready' && entry.payload ? (
                          <button
                            type="button"
                            onClick={() => setWikiPreviewPoolEntryId(entry.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100"
                          >
                            <Eye size={14} aria-hidden />
                            Jeu
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {entry.payload ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPayloadId(expandedPayloadId === entry.id ? null : entry.id)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                          >
                            {expandedPayloadId === entry.id ? (
                              <ChevronDown size={14} aria-hidden />
                            ) : (
                              <ChevronRight size={14} aria-hidden />
                            )}
                            Aperçu
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedPayloadId === entry.id && entry.payload ? (
                      <tr>
                        <td colSpan={9} className="bg-slate-50 border-t border-slate-100 px-4 py-4">
                          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                              Données récupérées (Wikipédia / parse)
                            </h4>
                            <WikiPoolPayloadPreview payload={entry.payload} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WikiGamePreviewModal
        isOpen={wikiPreviewPoolEntryId !== null}
        onClose={() => setWikiPreviewPoolEntryId(null)}
        poolEntryId={wikiPreviewPoolEntryId}
      />
    </AdminLayout>
  )
}
