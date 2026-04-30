/**
 * admin/pages/SeriesPage.tsx
 * Full CRUD for TV series: table + modal form.
 */

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, X, Shuffle } from 'lucide-react'
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
import { BackdropPicker } from '../components/BackdropPicker'

// ─── Simple modal wrapper ─────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4 sm:my-8">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({
  series,
  onConfirm,
  onCancel,
  loading,
}: {
  series: AdminSeries
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <Modal title="Supprimer la série" onClose={onCancel}>
      <p className="text-sm text-gray-600 mb-6">
        Êtes-vous sûr de vouloir supprimer{' '}
        <strong className="text-gray-900">« {series.title} »</strong> ? Cette
        action est irréversible.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          Supprimer
        </button>
      </div>
    </Modal>
  )
}

// ─── SeriesPage ───────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'create'; initial?: SeriesPayload }
  | { type: 'edit'; series: AdminSeries }
  | { type: 'delete'; series: AdminSeries }
  | { type: 'backdrops'; series: AdminSeries }
  | null

export function SeriesPage() {
  const [seriesList, setSeriesList] = useState<AdminSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [randomLoading, setRandomLoading] = useState(false)
  const [search, setSearch] = useState('')

  function showSuccess(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const load = useCallback(() => {
    setLoading(true)
    getSeries()
      .then(setSeriesList)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleRandomSeries() {
    setRandomLoading(true)
    try {
      const payload = await getRandomTmdbSeries()
      setModal({ type: 'create', initial: payload })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur TMDB')
    } finally {
      setRandomLoading(false)
    }
  }

  async function handleCreate(payload: SeriesPayload) {
    await createSeries(payload)
    setModal(null)
    load()
  }

  async function handleEdit(payload: SeriesPayload) {
    if (modal?.type !== 'edit') return
    await updateSeries(modal.series.id, payload)
    setModal(null)
    load()
  }

  async function handleBackdropSelect(imageUrl: string) {
    if (modal?.type !== 'backdrops') return
    const seriesId = modal.series.id
    try {
      await updateSeries(seriesId, { image_url: imageUrl })
      setModal(null)
      load()
      showSuccess('Image mise à jour')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  async function handleUpload(series: AdminSeries, file: File) {
    try {
      await uploadSeriesImage(series.id, file)
      load()
      showSuccess('Image uploadée')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload')
    }
  }

  async function handleDelete() {
    if (modal?.type !== 'delete') return
    setDeleteLoading(true)
    try {
      await deleteSeries(modal.series.id)
      setModal(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = seriesList.filter(
    (s) =>
      search.trim() === '' ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.creator.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une série..."
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
          />
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

      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            {search ? 'Aucune série trouvée pour cette recherche.' : 'Aucune série enregistrée.'}
          </div>
        ) : (
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-3 w-20"></th>
                <th className="px-3 py-3">Titre</th>
                <th className="px-3 py-3 hidden sm:table-cell">Année</th>
                <th className="px-3 py-3 hidden md:table-cell">Créateur</th>
                <th className="px-3 py-3 hidden lg:table-cell">Statut</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((series) => (
                <SeriesRow
                  key={series.id}
                  series={series}
                  onEdit={(s) => setModal({ type: 'edit', series: s })}
                  onDelete={(s) => setModal({ type: 'delete', series: s })}
                  onBackdrops={(s) => setModal({ type: 'backdrops', series: s })}
                  onUpload={handleUpload}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {filtered.length} série{filtered.length !== 1 ? 's' : ''}
        {search && ` sur ${seriesList.length}`}
      </p>

      {/* Modals */}
      {modal?.type === 'create' && (
        <Modal title="Ajouter une série" onClose={() => setModal(null)}>
          <SeriesForm
            initial={modal.initial}
            onSubmit={handleCreate}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Modifier la série" onClose={() => setModal(null)}>
          <SeriesForm
            initial={modal.series}
            onSubmit={handleEdit}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <ConfirmDeleteModal
          series={modal.series}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          loading={deleteLoading}
        />
      )}

      {modal?.type === 'backdrops' && (
        <BackdropPicker
          seriesId={modal.series.id}
          onSelect={handleBackdropSelect}
          onClose={() => setModal(null)}
        />
      )}
    </AdminLayout>
  )
}
