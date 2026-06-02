import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Search, Shuffle, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  getFilms,
  createFilm,
  updateFilm,
  deleteFilm,
  uploadFilmImage,
  getRandomTmdbFilm,
  type AdminFilm,
  type FilmPayload,
} from '../api'
import { AdminLayout } from '../components/AdminLayout'
import { FilmForm } from '../components/FilmForm'
import { FilmRow } from '../components/FilmRow'
import { FilmSeriesGamePreviewModal } from '../components/FilmSeriesGamePreviewModal'
import { BackdropPicker } from '../components/BackdropPicker'
import { Pagination } from '../components/Pagination'
import { Modal, ConfirmDeleteModal } from '../components/Modal'
import { useModal } from '../hooks/useModal'
import { useList } from '../hooks/useList'
import { useToast } from '../hooks/useToast'

type ActiveFilter = 'all' | 'active' | 'inactive'

type ModalState =
  | { type: 'create'; initial?: Partial<AdminFilm> }
  | { type: 'edit'; film: AdminFilm }
  | { type: 'delete'; film: AdminFilm }
  | { type: 'bulkDelete'; ids: number[] }
  | { type: 'backdrops'; film: AdminFilm }

export function FilmsPage() {
  const toast = useToast()
  const { modal, setModal, close } = useModal<ModalState>()
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [randomLoading, setRandomLoading] = useState(false)
  const [previewFilmId, setPreviewFilmId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetcher = useCallback(
    (opts: { page: number; limit: number; q: string }) =>
      getFilms({ ...opts, isActive: activeFilter === 'all' ? undefined : activeFilter === 'active' }),
    [activeFilter],
  )

  const { items: films, loading, error, page, pages, total, search, setSearch, setPage, reload, setItems } =
    useList(fetcher)

  // Clear selection when list changes
  useEffect(() => { setSelected(new Set()) }, [films])

  // Keyboard shortcuts: N = new, / = search focus
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
    setSelected((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? new Set(films.map((f) => f.id)) : new Set())
  }

  async function handleRandomFilm() {
    setRandomLoading(true)
    try {
      const film = await getRandomTmdbFilm()
      setModal({ type: 'create', initial: film as Partial<AdminFilm> })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur TMDB')
    } finally {
      setRandomLoading(false)
    }
  }

  async function handleCreate(payload: FilmPayload) {
    await createFilm(payload)
    close()
    reload()
    toast.success('Film créé')
  }

  async function handleEdit(payload: FilmPayload) {
    if (modal?.type !== 'edit') return
    await updateFilm(modal.film.id, payload)
    close()
    reload()
    toast.success('Film mis à jour')
  }

  async function handleBackdropSelect(imageUrl: string) {
    if (modal?.type !== 'backdrops') return
    try {
      await updateFilm(modal.film.id, { image_url: imageUrl })
      close()
      reload()
      toast.success('Image mise à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  async function handleUpload(film: AdminFilm, file: File) {
    try {
      await uploadFilmImage(film.id, file)
      reload()
      toast.success('Image uploadée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur upload')
    }
  }

  // Delete with undo: optimistic removal + 5s window to cancel
  function handleDelete() {
    if (modal?.type !== 'delete') return
    const film = modal.film
    close()
    setItems((prev) => prev.filter((f) => f.id !== film.id))

    let cancelled = false
    const onUndo = () => { cancelled = true; reload() }
    toast.success(`« ${film.title} » supprimé`, { undo: onUndo })

    setTimeout(async () => {
      if (cancelled) return
      try { await deleteFilm(film.id) }
      catch { toast.error('Échec de la suppression'); reload() }
    }, 5000)
  }

  // Bulk: activate / deactivate
  async function handleBulkToggle(activate: boolean) {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      await Promise.all([...selected].map((id) => updateFilm(id, { is_active: activate })))
      toast.success(`${selected.size} film${selected.size > 1 ? 's' : ''} ${activate ? 'activé' : 'désactivé'}${selected.size > 1 ? 's' : ''}`)
      setSelected(new Set())
      reload()
    } catch {
      toast.error('Erreur lors de la mise à jour en lot')
    } finally {
      setBulkLoading(false)
    }
  }

  // Bulk delete with undo
  function handleBulkDeleteConfirm() {
    if (modal?.type !== 'bulkDelete') return
    const ids = modal.ids
    close()
    setItems((prev) => prev.filter((f) => !ids.includes(f.id)))

    let cancelled = false
    const onUndo = () => { cancelled = true; reload() }
    toast.success(`${ids.length} film${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`, { undo: onUndo })

    setTimeout(async () => {
      if (cancelled) return
      try { await Promise.all(ids.map((id) => deleteFilm(id))) }
      catch { toast.error('Échec de la suppression en lot'); reload() }
    }, 5000)
  }

  const allSelected = films.length > 0 && selected.size === films.length
  const filterLabel: Record<ActiveFilter, string> = { all: 'Tous', active: 'Actifs', inactive: 'Inactifs' }

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
            placeholder="Rechercher un film… (/)"
            className="pl-9 pr-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
          />
        </div>

        {/* is_active filter */}
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
            onClick={handleRandomFilm}
            disabled={randomLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {randomLoading
              ? <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              : <Shuffle size={15} />
            }
            <span className="hidden sm:inline">Film aléatoire</span>
          </button>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            title="Nouveau film (N)"
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-800 flex-1">
            {selected.size} film{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => handleBulkToggle(true)}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            <ToggleRight size={14} /> Activer
          </button>
          <button
            onClick={() => handleBulkToggle(false)}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ToggleLeft size={14} /> Désactiver
          </button>
          <button
            onClick={() => setModal({ type: 'bulkDelete', ids: [...selected] })}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} /> Supprimer
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-indigo-500 hover:text-indigo-700 underline ml-1"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : films.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            {search ? 'Aucun film trouvé pour cette recherche.' : 'Aucun film enregistré.'}
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
                  <th className="px-3 py-3 hidden md:table-cell">Réalisateur</th>
                  <th className="px-3 py-3 hidden lg:table-cell">Statut</th>
                  <th className="sticky right-0 bg-gray-50 px-3 py-3 text-right whitespace-nowrap border-l border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {films.map((film) => (
                  <FilmRow
                    key={film.id}
                    film={film}
                    selected={selected.has(film.id)}
                    onSelect={toggleSelect}
                    onEdit={(f) => setModal({ type: 'edit', film: f })}
                    onDelete={(f) => { setDeleteError(null); setModal({ type: 'delete', film: f }) }}
                    onBackdrops={(f) => setModal({ type: 'backdrops', film: f })}
                    onUpload={handleUpload}
                    onPreview={(f) => setPreviewFilmId(f.id)}
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
        <Modal title="Ajouter un film" onClose={close}>
          <FilmForm initial={modal.initial} onSubmit={handleCreate} onCancel={close} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Modifier le film" onClose={close}>
          <FilmForm initial={modal.film} onSubmit={handleEdit} onCancel={close} />
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <ConfirmDeleteModal
          title="Supprimer le film"
          name={modal.film.title}
          onConfirm={handleDelete}
          onCancel={() => { close(); setDeleteError(null) }}
          loading={false}
          error={deleteError}
        />
      )}

      {modal?.type === 'bulkDelete' && (
        <ConfirmDeleteModal
          title={`Supprimer ${modal.ids.length} film${modal.ids.length > 1 ? 's' : ''}`}
          name={`${modal.ids.length} film${modal.ids.length > 1 ? 's' : ''} sélectionné${modal.ids.length > 1 ? 's' : ''}`}
          onConfirm={handleBulkDeleteConfirm}
          onCancel={close}
          loading={false}
        />
      )}

      {modal?.type === 'backdrops' && (
        <BackdropPicker filmId={modal.film.id} onSelect={handleBackdropSelect} onClose={close} />
      )}

      <FilmSeriesGamePreviewModal
        isOpen={previewFilmId !== null}
        onClose={() => setPreviewFilmId(null)}
        mode="film"
        mediaId={previewFilmId}
      />
    </AdminLayout>
  )
}
