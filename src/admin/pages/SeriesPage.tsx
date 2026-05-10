import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Search, Shuffle, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  uploadSeriesImage,
  getRandomTmdbSeries,
  type AdminSeries,
  type SeriesPayload,
} from '../api'
import { AdminLayout } from '../components/AdminLayout'
import { SeriesForm } from '../components/SeriesForm'
import { SeriesRow } from '../components/SeriesRow'
import { FilmSeriesGamePreviewModal } from '../components/FilmSeriesGamePreviewModal'
import { BackdropPicker } from '../components/BackdropPicker'
import { Pagination } from '../components/Pagination'
import { Modal, ConfirmDeleteModal } from '../components/Modal'
import { useModal } from '../hooks/useModal'
import { useList } from '../hooks/useList'
import { useToast } from '../hooks/useToast'

type ActiveFilter = 'all' | 'active' | 'inactive'

type ModalState =
  | { type: 'create'; initial?: SeriesPayload }
  | { type: 'edit'; series: AdminSeries }
  | { type: 'delete'; series: AdminSeries }
  | { type: 'bulkDelete'; ids: number[] }
  | { type: 'backdrops'; series: AdminSeries }

export function SeriesPage() {
  const toast = useToast()
  const { modal, setModal, close } = useModal<ModalState>()
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [randomLoading, setRandomLoading] = useState(false)
  const [previewSeriesId, setPreviewSeriesId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetcher = useCallback(
    (opts: { page: number; limit: number; q: string }) =>
      getSeries({ ...opts, isActive: activeFilter === 'all' ? undefined : activeFilter === 'active' }),
    [activeFilter],
  )

  const { items: seriesList, loading, error, page, pages, total, search, setSearch, setPage, reload, setItems } =
    useList(fetcher)

  useEffect(() => { setSelected(new Set()) }, [seriesList])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setModal({ type: 'create' }) }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setModal])

  function toggleSelect(id: number, checked: boolean) {
    setSelected((prev) => { const next = new Set(prev); checked ? next.add(id) : next.delete(id); return next })
  }

  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? new Set(seriesList.map((s) => s.id)) : new Set())
  }

  async function handleRandomSeries() {
    setRandomLoading(true)
    try {
      const payload = await getRandomTmdbSeries()
      setModal({ type: 'create', initial: payload })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur TMDB')
    } finally {
      setRandomLoading(false)
    }
  }

  async function handleCreate(payload: SeriesPayload) {
    await createSeries(payload)
    close()
    reload()
    toast.success('Série créée')
  }

  async function handleEdit(payload: SeriesPayload) {
    if (modal?.type !== 'edit') return
    await updateSeries(modal.series.id, payload)
    close()
    reload()
    toast.success('Série mise à jour')
  }

  async function handleBackdropSelect(imageUrl: string) {
    if (modal?.type !== 'backdrops') return
    try {
      await updateSeries(modal.series.id, { image_url: imageUrl })
      close()
      reload()
      toast.success('Image mise à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  async function handleUpload(series: AdminSeries, file: File) {
    try {
      await uploadSeriesImage(series.id, file)
      reload()
      toast.success('Image uploadée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur upload')
    }
  }

  function handleDelete() {
    if (modal?.type !== 'delete') return
    const series = modal.series
    close()
    setItems((prev) => prev.filter((s) => s.id !== series.id))

    let cancelled = false
    const onUndo = () => { cancelled = true; reload() }
    toast.success(`« ${series.title} » supprimée`, { undo: onUndo })

    setTimeout(async () => {
      if (cancelled) return
      try { await deleteSeries(series.id) }
      catch { toast.error('Échec de la suppression'); reload() }
    }, 5000)
  }

  async function handleBulkToggle(activate: boolean) {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      await Promise.all([...selected].map((id) => updateSeries(id, { is_active: activate })))
      toast.success(`${selected.size} série${selected.size > 1 ? 's' : ''} ${activate ? 'activée' : 'désactivée'}${selected.size > 1 ? 's' : ''}`)
      setSelected(new Set())
      reload()
    } catch {
      toast.error('Erreur lors de la mise à jour en lot')
    } finally {
      setBulkLoading(false)
    }
  }

  function handleBulkDeleteConfirm() {
    if (modal?.type !== 'bulkDelete') return
    const ids = modal.ids
    close()
    setItems((prev) => prev.filter((s) => !ids.includes(s.id)))

    let cancelled = false
    const onUndo = () => { cancelled = true; reload() }
    toast.success(`${ids.length} série${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''}`, { undo: onUndo })

    setTimeout(async () => {
      if (cancelled) return
      try { await Promise.all(ids.map((id) => deleteSeries(id))) }
      catch { toast.error('Échec de la suppression en lot'); reload() }
    }, 5000)
  }

  const allSelected = seriesList.length > 0 && selected.size === seriesList.length
  const filterLabel: Record<ActiveFilter, string> = { all: 'Toutes', active: 'Actives', inactive: 'Inactives' }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une série… (/)"
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
          />
        </div>

        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium shrink-0">
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={['px-3 py-2 transition-colors', activeFilter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'].join(' ')}
            >
              {filterLabel[f]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={handleRandomSeries}
            disabled={randomLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {randomLoading
              ? <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              : <Shuffle size={15} />
            }
            <span className="hidden sm:inline">Série aléatoire</span>
          </button>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            title="Nouvelle série (N)"
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-800 flex-1">
            {selected.size} série{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <button onClick={() => handleBulkToggle(true)} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50">
            <ToggleRight size={14} /> Activer
          </button>
          <button onClick={() => handleBulkToggle(false)} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            <ToggleLeft size={14} /> Désactiver
          </button>
          <button onClick={() => setModal({ type: 'bulkDelete', ids: [...selected] })} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            <Trash2 size={14} /> Supprimer
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-indigo-500 hover:text-indigo-700 underline ml-1">
            Annuler
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : seriesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            {search ? 'Aucune série trouvée pour cette recherche.' : 'Aucune série enregistrée.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 accent-indigo-600"
                    />
                  </th>
                  <th className="px-3 py-3 w-20"></th>
                  <th className="px-3 py-3">Titre</th>
                  <th className="px-3 py-3 hidden sm:table-cell">Année</th>
                  <th className="px-3 py-3 hidden md:table-cell">Créateur</th>
                  <th className="px-3 py-3 hidden lg:table-cell">Statut</th>
                  <th className="sticky right-0 bg-gray-50 px-3 py-3 text-right whitespace-nowrap border-l border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {seriesList.map((series) => (
                  <SeriesRow
                    key={series.id}
                    series={series}
                    selected={selected.has(series.id)}
                    onSelect={toggleSelect}
                    onEdit={(s) => setModal({ type: 'edit', series: s })}
                    onDelete={(s) => { setDeleteError(null); setModal({ type: 'delete', series: s }) }}
                    onBackdrops={(s) => setModal({ type: 'backdrops', series: s })}
                    onUpload={handleUpload}
                    onPreview={(s) => setPreviewSeriesId(s.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} pages={pages} total={total} limit={20} onPage={setPage} />

      {modal?.type === 'create' && (
        <Modal title="Ajouter une série" onClose={close}>
          <SeriesForm initial={modal.initial} onSubmit={handleCreate} onCancel={close} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Modifier la série" onClose={close}>
          <SeriesForm initial={modal.series} onSubmit={handleEdit} onCancel={close} />
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <ConfirmDeleteModal
          title="Supprimer la série"
          name={modal.series.title}
          onConfirm={handleDelete}
          onCancel={() => { close(); setDeleteError(null) }}
          loading={false}
          error={deleteError}
        />
      )}

      {modal?.type === 'bulkDelete' && (
        <ConfirmDeleteModal
          title={`Supprimer ${modal.ids.length} série${modal.ids.length > 1 ? 's' : ''}`}
          name={`${modal.ids.length} série${modal.ids.length > 1 ? 's' : ''} sélectionnée${modal.ids.length > 1 ? 's' : ''}`}
          onConfirm={handleBulkDeleteConfirm}
          onCancel={close}
          loading={false}
        />
      )}

      {modal?.type === 'backdrops' && (
        <BackdropPicker seriesId={modal.series.id} onSelect={handleBackdropSelect} onClose={close} />
      )}

      <FilmSeriesGamePreviewModal
        isOpen={previewSeriesId !== null}
        onClose={() => setPreviewSeriesId(null)}
        mode="series"
        mediaId={previewSeriesId}
      />
    </AdminLayout>
  )
}
