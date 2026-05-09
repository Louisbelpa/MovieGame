import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, ExternalLink, Eye, HelpCircle, Loader2, Plus, RefreshCw, UserPlus } from 'lucide-react'
import { AdminLayout } from '../components/AdminLayout'
import { WikiGamePreviewModal } from '../components/WikiGamePreviewModal'
import {
  addWikiPrefetchPoolEntry,
  getWikiPrefetchPool,
  getWikiPrefetchSettings,
  importWikiPersonFromPrefetchPool,
  refetchWikiPrefetchPoolEntry,
  type WikipediaFetchPayload,
  type WikiPrefetchPoolEntry,
  type WikiPrefetchPoolHasWikiFilter,
} from '../api'

function statusBadge(status: WikiPrefetchPoolEntry['status']): string {
  if (status === 'ready') return 'bg-emerald-100 text-emerald-700'
  if (status === 'processing') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

const PARIS_TZ = 'Europe/Paris'

const MIN_FAME_DESC_PLAIN =
  'Seuil minimal de sitelinks Wikidata (liens vers l’entité dans d’autres langues), comparable à une « notoriété » TMDB : plus le nombre est élevé, plus les profils tirés au hasard pour ce segment sont connus à l’international. Nom technique API : minFame.'

/** Expiration (ms epoch) ou MAJ (ISO serveur) — même rendu court en français. */
function formatPoolDateTimeFr(isoOrMs: number | string): string {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs)
  if (!Number.isFinite(d.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: PARIS_TZ,
  }).format(d)
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

function poolEntryDisplayName(entry: WikiPrefetchPoolEntry): string {
  const fromPayload = entry.payload?.name?.trim()
  if (fromPayload) return fromPayload
  const slug = entry.resolved_slug ?? entry.source_slug
  return slug.replace(/_/g, ' ') || slug
}

function poolPersonTypePillClass(personType: WikipediaFetchPayload['person_type'] | undefined): string {
  const base = 'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium'
  if (!personType) return `${base} bg-slate-100 text-slate-700`
  if (personType === 'politician') return `${base} bg-indigo-100 text-indigo-800`
  if (personType === 'sportsperson') return `${base} bg-violet-100 text-violet-800`
  if (personType === 'artist') return `${base} bg-pink-100 text-pink-800`
  if (personType === 'scientist') return `${base} bg-cyan-100 text-cyan-800`
  if (personType === 'entrepreneur') return `${base} bg-amber-100 text-amber-900`
  if (personType === 'writer') return `${base} bg-orange-100 text-orange-900`
  if (personType === 'historical_figure') return `${base} bg-stone-100 text-stone-800`
  return `${base} bg-slate-100 text-slate-700`
}

function PoolEntryTableIdentityCell({ entry }: { entry: WikiPrefetchPoolEntry }) {
  const name = poolEntryDisplayName(entry)
  const initial = name.trim().slice(0, 1).toUpperCase() || '?'
  const pt = entry.payload?.person_type

  return (
    <div className="flex items-start gap-2 min-w-0 max-w-[240px]">
      {entry.payload?.photo_url ? (
        <img
          src={entry.payload.photo_url}
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg object-cover border border-gray-200 bg-gray-100"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold"
          aria-hidden
        >
          {initial}
        </div>
      )}
      <div className="min-w-0 space-y-0.5">
        <div className="font-semibold text-gray-900 leading-snug">{name}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {pt ? (
            <span className={poolPersonTypePillClass(pt)}>{PERSON_TYPE_LABEL[pt] ?? pt}</span>
          ) : null}
          {entry.has_wiki_person && entry.wiki_person_id != null ? (
            <span className="inline-flex rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-950 ring-1 ring-sky-200/80">
              Fiche #{entry.wiki_person_id}
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-gray-500 font-mono truncate">{entry.resolved_slug ?? entry.source_slug}</div>
      </div>
    </div>
  )
}

function PoolEntryIdentity({
  entry,
  metaRight,
}: {
  entry: WikiPrefetchPoolEntry
  metaRight?: ReactNode
}) {
  const name = poolEntryDisplayName(entry)
  const pt = entry.payload?.person_type
  const initial = name.trim().slice(0, 1).toUpperCase() || '?'

  return (
    <div className="flex gap-3 items-start min-w-0">
      <div className="shrink-0">
        {entry.payload?.photo_url ? (
          <img
            src={entry.payload.photo_url}
            alt=""
            className="h-14 w-14 sm:h-12 sm:w-12 rounded-xl object-cover border border-gray-200 bg-gray-100"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="h-14 w-14 sm:h-12 sm:w-12 rounded-xl border border-gray-200 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 font-semibold text-lg"
            aria-hidden
          >
            {initial}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 leading-snug">{name}</h3>
              <span className="text-[10px] font-medium text-gray-400 tabular-nums shrink-0">#{entry.id}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pt ? <span className={poolPersonTypePillClass(pt)}>{PERSON_TYPE_LABEL[pt] ?? pt}</span> : null}
              {entry.has_wiki_person && entry.wiki_person_id != null ? (
                <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-950 ring-1 ring-sky-200/80">
                  Fiche existante · #{entry.wiki_person_id}
                </span>
              ) : null}
            </div>
          </div>
          {metaRight ? <div className="shrink-0 flex flex-col items-end gap-1">{metaRight}</div> : null}
        </div>
        <p className="text-xs text-gray-500 font-mono break-all leading-relaxed">
          <span className="text-gray-400 font-sans mr-1">Slug</span>
          {entry.resolved_slug ?? entry.source_slug}
        </p>
        {entry.payload?.wikipedia_url ? (
          <a
            href={entry.payload.wikipedia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
          >
            Ouvrir Wikipédia <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
    </div>
  )
}

function PoolEntryActionButtons({
  entry,
  enabled,
  importingPoolId,
  refetchingId,
  expandedPayloadId,
  onToggleExpand,
  onPreviewGame,
  onImport,
  onRefetch,
}: {
  entry: WikiPrefetchPoolEntry
  enabled: boolean
  importingPoolId: number | null
  refetchingId: number | null
  expandedPayloadId: number | null
  onToggleExpand: () => void
  onPreviewGame: () => void
  onImport: () => void
  onRefetch: () => void
}) {
  const btn =
    'inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium'
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {entry.status === 'ready' && entry.payload ? (
        <>
          <button
            type="button"
            onClick={onPreviewGame}
            className={`${btn} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100`}
          >
            <Eye size={14} aria-hidden />
            Jeu
          </button>
          <button
            type="button"
            title={
              entry.has_wiki_person
                ? `Une fiche existe déjà (#${entry.wiki_person_id ?? '?'})`
                : 'Créer une fiche dans Personnalités (même contenu que ce pool)'
            }
            disabled={importingPoolId !== null || entry.has_wiki_person}
            onClick={onImport}
            className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-50`}
          >
            {importingPoolId === entry.id ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <UserPlus size={14} aria-hidden />
            )}
            Fiche
          </button>
        </>
      ) : null}
      <button
        type="button"
        title="Relancer le fetch Wikipédia"
        disabled={refetchingId !== null || !enabled}
        onClick={onRefetch}
        className={`${btn} border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50`}
      >
        {refetchingId === entry.id ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <RefreshCw size={14} aria-hidden />
        )}
        Relancer
      </button>
      {entry.payload ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className={`${btn} border-gray-200 bg-white text-indigo-700 hover:bg-indigo-50`}
        >
          {expandedPayloadId === entry.id ? (
            <ChevronDown size={14} aria-hidden />
          ) : (
            <ChevronRight size={14} aria-hidden />
          )}
          Aperçu
        </button>
      ) : null}
    </div>
  )
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalMatching, setTotalMatching] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasWikiPersonFilter, setHasWikiPersonFilter] = useState<WikiPrefetchPoolHasWikiFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [minFame, setMinFame] = useState(30)
  const [enabled, setEnabled] = useState(true)
  const [addInput, setAddInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [expandedPayloadId, setExpandedPayloadId] = useState<number | null>(null)
  const [wikiPreviewPoolEntryId, setWikiPreviewPoolEntryId] = useState<number | null>(null)
  const [refetchingId, setRefetchingId] = useState<number | null>(null)
  const [importingPoolId, setImportingPoolId] = useState<number | null>(null)

  useEffect(() => {
    setPage(1)
  }, [lang, minFame])

  const pullPoolPage = useCallback(
    async (targetPage: number) => {
      const data = await getWikiPrefetchPool({
        lang,
        minFame,
        page: targetPage,
        pageSize,
        hasWikiPerson: hasWikiPersonFilter,
      })
      setEntries(data.entries)
      setStats(data.stats)
      setTotalMatching(data.totalMatching)
      setTotalPages(data.totalPages)
      setPage(data.page)
      return data
    },
    [lang, minFame, pageSize, hasWikiPersonFilter],
  )

  const load = useCallback((): Promise<void> => {
    setLoading(true)
    setError(null)
    return pullPoolPage(page)
      .then(() => getWikiPrefetchSettings())
      .then((settings) => setEnabled(settings.enabled))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur chargement pool'))
      .finally(() => setLoading(false))
  }, [page, pullPoolPage])

  useEffect(() => {
    load()
  }, [load])

  return (
    <AdminLayout>
      <div className="flex flex-col gap-1.5 sm:gap-3 mb-2 sm:mb-4 max-sm:-mx-0.5">
        <div className="flex flex-wrap gap-1.5 sm:gap-3 items-end">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1 basis-[calc(50%-0.2rem)] sm:basis-auto sm:flex-none sm:min-w-[8rem]">
            <label htmlFor="pool-lang" className="text-[10px] sm:text-xs text-gray-500">Langue</label>
            <select
              id="pool-lang"
              value={lang}
              onChange={(e) => setLang(e.target.value as 'fr' | 'en')}
              className="rounded-md sm:rounded-lg border border-gray-300 px-1.5 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-sm bg-white w-full sm:w-auto max-sm:min-h-0"
            >
              <option value="fr">FR</option>
              <option value="en">EN</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5 w-full flex-1 basis-full sm:basis-auto sm:flex-none sm:w-28">
            <div className="flex items-center gap-1">
              <label htmlFor="pool-minfame" className="text-[10px] sm:text-xs text-gray-500 leading-tight">
                Notoriété min. (Wikidata)
              </label>
              <span className="relative inline-flex shrink-0 group/minfame">
                <button
                  type="button"
                  className="rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  aria-label={`Aide : ${MIN_FAME_DESC_PLAIN}`}
                  title={MIN_FAME_DESC_PLAIN}
                >
                  <HelpCircle className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
                </button>
                <span
                  role="tooltip"
                  className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-1 w-[min(calc(100vw-2rem),17rem)] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left text-[11px] leading-snug text-gray-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover/minfame:visible group-hover/minfame:opacity-100 group-focus-within/minfame:visible group-focus-within/minfame:opacity-100 sm:left-auto sm:right-0 sm:w-72 sm:translate-x-0"
                >
                  Seuil minimal de{' '}
                  <strong className="font-medium text-gray-800">sitelinks</strong> Wikidata (liens vers l’entité dans d’autres langues), comparable à une « notoriété » TMDB : plus le nombre est élevé, plus les profils tirés au hasard pour ce segment sont connus à l’international. Nom technique API :{' '}
                  <code className="rounded bg-gray-100 px-1 py-px text-[10px] text-gray-900">minFame</code>.
                </span>
              </span>
            </div>
            <input
              id="pool-minfame"
              type="number"
              min={5}
              max={100}
              value={minFame}
              onChange={(e) => setMinFame(Math.max(5, Math.min(100, parseInt(e.target.value || '30', 10))))}
              className="rounded-md sm:rounded-lg border border-gray-300 px-1.5 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-sm w-full max-sm:min-h-0"
              aria-describedby="pool-minfame-desc"
            />
            <span id="pool-minfame-desc" className="sr-only">
              {MIN_FAME_DESC_PLAIN}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 flex-1 basis-[calc(50%-0.2rem)] min-w-0 sm:min-w-[10rem] sm:max-w-[14rem] sm:basis-auto">
            <label htmlFor="pool-wiki-filter" className="text-[10px] sm:text-xs text-gray-500 leading-tight">
              <span className="sm:hidden">Fiches</span>
              <span className="hidden sm:inline">Fiche Personnalités</span>
            </label>
            <select
              id="pool-wiki-filter"
              value={hasWikiPersonFilter}
              onChange={(e) => {
                setHasWikiPersonFilter(e.target.value as WikiPrefetchPoolHasWikiFilter)
                setPage(1)
              }}
              className="rounded-md sm:rounded-lg border border-gray-300 px-1.5 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-sm bg-white w-full max-sm:min-h-0"
            >
              <option value="all">Toutes les entrées</option>
              <option value="no">Sans fiche</option>
              <option value="yes">Fiche déjà créée</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5 w-full flex-1 basis-[calc(50%-0.2rem)] sm:basis-auto sm:flex-none sm:w-36">
            <label htmlFor="pool-page-size" className="text-[10px] sm:text-xs text-gray-500">Par page</label>
            <select
              id="pool-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="rounded-md sm:rounded-lg border border-gray-300 px-1.5 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-sm bg-white w-full max-sm:min-h-0"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex justify-center items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md sm:rounded-lg hover:bg-indigo-100 disabled:opacity-50 max-sm:min-h-0"
          >
            <RefreshCw size={12} className={`sm:w-3.5 sm:h-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>
      </div>

      <div className={`mb-2 sm:mb-4 rounded-lg sm:rounded-xl border px-2 py-1.5 sm:px-4 sm:py-3 text-[11px] sm:text-sm leading-snug ${
        enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-700'
      }`}>
        <span className="font-medium">Pool</span> : <strong>{enabled ? 'Actif' : 'Inactif'}</strong>
        {' · '}
        <Link to="/admin/settings" className="font-medium underline underline-offset-2 hover:no-underline">
          Réglages
        </Link>
        {enabled ? (
          <span className="hidden sm:block mt-1 text-[11px] opacity-90 font-normal">
            Active ou désactive le préfetch dans <strong className="font-medium">Réglages</strong>.{' '}
            Utilise <strong className="font-medium">Rafraîchir</strong> pour actualiser la liste affichée.
          </span>
        ) : (
          <span className="block mt-1 text-[11px] opacity-90 font-normal">
            Préfetch désactivé — réactive-le dans <strong className="font-medium">Réglages</strong> si besoin.
          </span>
        )}
      </div>

      <div className="mb-2 sm:mb-4 bg-white rounded-lg sm:rounded-xl border border-gray-200 p-2 sm:p-5">
        <h3 className="text-[11px] sm:text-sm font-semibold text-gray-900 mb-0.5 sm:mb-2">Ajouter au pool</h3>
        <p className="hidden sm:block text-xs text-gray-500 mb-2 sm:mb-3 leading-relaxed">
          Même recherche que dans le formulaire Wikipédia : nom, slug, titre de page ou URL. Utilise la <strong>langue</strong> et la <strong>notoriété min.</strong> sélectionnées ci-dessus (segment du pool). Si la fiche existe déjà pour cette combinaison, tu obtiens une erreur « déjà dans le pool ».
        </p>
        <p className="sm:hidden text-[10px] text-gray-500 mb-1.5 leading-snug">
          Nom, slug, URL Wikipédia — même critères que ci-dessus. Doublon → erreur pool.
        </p>
        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 sm:items-end">
          <div className="flex-1">
            <label htmlFor="pool-add-input" className="sr-only">Nom, slug ou URL Wikipédia</label>
            <input
              id="pool-add-input"
              type="text"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="Nom, slug ou URL…"
              className="w-full rounded-md sm:rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-sm placeholder:text-gray-400 max-sm:min-h-0"
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
                await pullPoolPage(1)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Échec ajout au pool')
              } finally {
                setAdding(false)
              }
            }}
            className="inline-flex justify-center items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-sm font-medium text-white bg-indigo-600 rounded-md sm:rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed max-sm:min-h-0"
          >
            {adding ? <Loader2 size={13} className="animate-spin sm:w-4 sm:h-4" /> : <Plus size={13} className="sm:w-4 sm:h-4" aria-hidden />}
            <span className="sm:hidden">{adding ? '…' : 'Ajouter'}</span>
            <span className="hidden sm:inline">{adding ? 'Récupération…' : 'Ajouter au pool'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl px-2 py-2 sm:px-4 sm:py-3"><div className="text-[10px] sm:text-xs text-gray-500">Total</div><div className="text-base sm:text-xl font-semibold tabular-nums">{stats.total}</div></div>
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl px-2 py-2 sm:px-4 sm:py-3"><div className="text-[10px] sm:text-xs text-gray-500">Ready</div><div className="text-base sm:text-xl font-semibold text-emerald-700 tabular-nums">{stats.ready}</div></div>
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl px-2 py-2 sm:px-4 sm:py-3"><div className="text-[10px] sm:text-xs text-gray-500">Processing</div><div className="text-base sm:text-xl font-semibold text-amber-700 tabular-nums">{stats.processing}</div></div>
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl px-2 py-2 sm:px-4 sm:py-3"><div className="text-[10px] sm:text-xs text-gray-500">Failed</div><div className="text-base sm:text-xl font-semibold text-red-700 tabular-nums">{stats.failed}</div></div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex flex-wrap items-center gap-3">
          <span>{success}</span>
          <Link to="/admin/wiki" className="font-medium text-emerald-900 underline hover:no-underline">
            Ouvrir Personnalités
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-36 flex items-center justify-center text-sm text-gray-500">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="h-36 flex items-center justify-center text-sm text-gray-400">Aucune entrée actuellement dans le pool.</div>
        ) : (
          <>
            <div className="md:hidden space-y-3 px-0.5 pb-1">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 ring-1 ring-black/[0.03]"
                >
                  <PoolEntryIdentity
                    entry={entry}
                    metaRight={
                      <>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(entry.status)}`}>
                          {entry.status}
                        </span>
                        <span className="text-xs text-gray-500 tabular-nums text-right">
                          Parse{' '}
                          {entry.payload && typeof entry.payload.parse_quality_score === 'number'
                            ? `${Math.round(entry.payload.parse_quality_score)} %`
                            : '—'}
                        </span>
                      </>
                    }
                  />
                  <dl className="grid gap-2 text-xs pt-1 border-t border-gray-100">
                    <div>
                      <dt className="text-gray-500 font-medium">Slug source</dt>
                      <dd className="font-mono text-gray-800 break-all">{entry.source_slug}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-gray-500 font-medium">Expire</dt>
                        <dd className="text-gray-800">{formatPoolDateTimeFr(entry.expires_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">MAJ</dt>
                        <dd className="text-gray-800">{formatPoolDateTimeFr(entry.updated_at)}</dd>
                      </div>
                    </div>
                    {entry.error_message ? (
                      <div>
                        <dt className="text-gray-500 font-medium">Erreur</dt>
                        <dd className="text-red-600 break-words">{entry.error_message}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <PoolEntryActionButtons
                    entry={entry}
                    enabled={enabled}
                    importingPoolId={importingPoolId}
                    refetchingId={refetchingId}
                    expandedPayloadId={expandedPayloadId}
                    onToggleExpand={() =>
                      setExpandedPayloadId(expandedPayloadId === entry.id ? null : entry.id)
                    }
                    onPreviewGame={() => setWikiPreviewPoolEntryId(entry.id)}
                    onImport={() => {
                      void (async () => {
                        setImportingPoolId(entry.id)
                        setError(null)
                        setSuccess(null)
                        try {
                          const { id: wikiId } = await importWikiPersonFromPrefetchPool(entry.id)
                          setSuccess(`Fiche créée (id ${wikiId}). Tu peux l’éditer dans Personnalités.`)
                          await pullPoolPage(page)
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Import impossible')
                        } finally {
                          setImportingPoolId(null)
                        }
                      })()
                    }}
                    onRefetch={() => {
                      void (async () => {
                        setRefetchingId(entry.id)
                        setError(null)
                        try {
                          const r = await refetchWikiPrefetchPoolEntry(entry.id)
                          if (!r.ok && r.error) setError(r.error)
                          await pullPoolPage(page)
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Refetch impossible')
                        } finally {
                          setRefetchingId(null)
                        }
                      })()
                    }}
                  />
                  {expandedPayloadId === entry.id && entry.payload ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Données récupérées (Wikipédia / parse)
                      </h4>
                      <WikiPoolPayloadPreview payload={entry.payload} />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px] lg:min-w-[1180px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3 min-w-[13rem]">Personne</th>
                  <th className="px-3 py-3 whitespace-nowrap w-20">Parse</th>
                  <th className="px-3 py-3">Slug source</th>
                  <th className="px-3 py-3">Slug résolu</th>
                  <th className="px-3 py-3">Expire le</th>
                  <th className="px-3 py-3">MAJ</th>
                  <th className="px-3 py-3">Erreur</th>
                  <th className="px-3 py-3 whitespace-nowrap">Aperçu jeu</th>
                  <th className="px-3 py-3 whitespace-nowrap">Importer</th>
                  <th className="px-3 py-3 whitespace-nowrap">Refetch</th>
                  <th className="px-3 py-3 w-28">Contenu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {entries.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr className="even:bg-gray-50/70 hover:bg-indigo-50/35 transition-colors">
                      <td className="px-3 py-2 align-top">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(entry.status)}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <PoolEntryTableIdentityCell entry={entry} />
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-700 tabular-nums">
                        {entry.payload && typeof entry.payload.parse_quality_score === 'number'
                          ? `${Math.round(entry.payload.parse_quality_score)} %`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.source_slug}</td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.resolved_slug ?? '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{formatPoolDateTimeFr(entry.expires_at)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{formatPoolDateTimeFr(entry.updated_at)}</td>
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
                        {entry.status === 'ready' && entry.payload ? (
                          <button
                            type="button"
                            title={
                              entry.has_wiki_person
                                ? `Une fiche existe déjà (#${entry.wiki_person_id ?? '?'})`
                                : 'Créer une fiche dans Personnalités (même contenu que ce pool)'
                            }
                            disabled={importingPoolId !== null || entry.has_wiki_person}
                            onClick={async () => {
                              setImportingPoolId(entry.id)
                              setError(null)
                              setSuccess(null)
                              try {
                                const { id: wikiId } = await importWikiPersonFromPrefetchPool(entry.id)
                                setSuccess(`Fiche créée (id ${wikiId}). Tu peux l’éditer dans Personnalités.`)
                                await pullPoolPage(page)
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Import impossible')
                              } finally {
                                setImportingPoolId(null)
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {importingPoolId === entry.id ? (
                              <Loader2 size={14} className="animate-spin" aria-hidden />
                            ) : (
                              <UserPlus size={14} aria-hidden />
                            )}
                            Fiche
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title="Relancer le fetch Wikipédia"
                          disabled={refetchingId !== null || !enabled}
                          onClick={async () => {
                            setRefetchingId(entry.id)
                            setError(null)
                            try {
                              const r = await refetchWikiPrefetchPoolEntry(entry.id)
                              if (!r.ok && r.error) setError(r.error)
                              await pullPoolPage(page)
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Refetch impossible')
                            } finally {
                              setRefetchingId(null)
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {refetchingId === entry.id ? (
                            <Loader2 size={14} className="animate-spin" aria-hidden />
                          ) : (
                            <RefreshCw size={14} aria-hidden />
                          )}
                          Relancer
                        </button>
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
                        <td colSpan={12} className="bg-slate-50 border-t border-slate-100 px-4 py-4">
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
          </>
        )}
        {!loading && enabled ? (
          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between px-3 py-2 sm:px-4 sm:py-3 border-t border-gray-100 bg-gray-50/90 text-xs sm:text-sm">
            <p className="text-gray-600">
              {totalMatching === 0
                ? 'Aucune entrée pour ces critères.'
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalMatching)} sur ${totalMatching} entrée(s)`}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 text-xs sm:text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                Précédent
              </button>
              <span className="text-gray-700 tabular-nums px-0.5 text-[11px] sm:text-sm">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 text-xs sm:text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                Suivant
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <WikiGamePreviewModal
        isOpen={wikiPreviewPoolEntryId !== null}
        onClose={() => setWikiPreviewPoolEntryId(null)}
        poolEntryId={wikiPreviewPoolEntryId}
      />
    </AdminLayout>
  )
}
