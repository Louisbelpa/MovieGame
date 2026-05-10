import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Search, Shuffle } from 'lucide-react'
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
  | { type: 'backdrops'; series: AdminSeries }

export function SeriesPage() {
  const toast = useToast()
  const { modal, setModal, close } = useModal<ModalState>()
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [randomLoading, setRandomLoading] = useState(false)
  const [previewSeriesId, setPreviewSeriesId] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetcher = useCallback(
    (opts: { page: number; limit: number; q: string }) =>
      getSeries({
        ...opts,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      }),
    [activeFilter],
  )

  const { items: seriesList, loading, error, page, pages, total, search, setSearch, setPage, reload } =
    useList(fetcher)

  // Keyboard shortcuts: N = new, / = search focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setModal({ type: 'create' })
      }
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setModal])

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

  async function handleDelete() {
    if (modal?.type !== 'delete') return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await deleteSeries(modal.series.id)
      close()
      reload()
      toast.success('Série supprimée')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filterLabel: Record<ActiveFilter, string> = {
    all: 'Toutes',
    active: 'Actives',
    inactive: 'Inactives',
  }

  return (
    <AdminLayout>
      {/* Top bar */}
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

        {/* is_active filter */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium shrink-0">
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={[
                'px-3 py-2 transition-colors',
                activeFilter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50',
              ].join(' ')}
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
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
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

      {/* Modals */}
      {modal?.type === 'create' && (
        <Modal title="Ajouter une série" onClose={close}>
          <SeriesForm
            initial={modal.initial}
            onSubmit={handleCreate}
            onCancel={close}
          />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Modifier la série" onClose={close}>
          <SeriesForm
            initial={modal.series}
            onSubmit={handleEdit}
            onCancel={close}
          />
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <ConfirmDeleteModal
          title="Supprimer la série"
          name={modal.series.title}
          onConfirm={handleDelete}
          onCancel={() => { close(); setDeleteError(null) }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      {modal?.type === 'backdrops' && (
        <BackdropPicker
          seriesId={modal.series.id}
          onSelect={handleBackdropSelect}
          onClose={close}
        />
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
