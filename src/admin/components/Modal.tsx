import { X } from 'lucide-react'

export function Modal({
  title,
  onClose,
  children,
  maxWidth = 'max-w-4xl',
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} my-4 sm:my-8`}>
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

export function ConfirmDeleteModal({
  title,
  name,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  title: string
  name: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error?: string | null
}) {
  return (
    <Modal title={title} onClose={onCancel} maxWidth="max-w-md">
      <p className="text-sm text-gray-600 mb-4">
        Êtes-vous sûr de vouloir supprimer{' '}
        <strong className="text-gray-900">« {name} »</strong> ? Cette action est irréversible.
      </p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}
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
