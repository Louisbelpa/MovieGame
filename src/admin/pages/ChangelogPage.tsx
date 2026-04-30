/**
 * admin/pages/ChangelogPage.tsx
 * CRUD interface for managing the public changelog.
 */

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { AdminLayout } from '../components/AdminLayout'
import {
  getChangelog,
  createChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
  type AdminChangelog,
} from '../api'

// ─── Entry form ───────────────────────────────────────────────────────────────

interface EntryFormProps {
  initial?: AdminChangelog
  onSave: (payload: Omit<AdminChangelog, 'id'>) => Promise<void>
  onCancel: () => void
}

function EntryForm({ initial, onSave, onCancel }: EntryFormProps) {
  const [version, setVersion] = useState(initial?.version ?? '')
  const [releaseDate, setReleaseDate] = useState(initial?.release_date ?? '')
  const [changesText, setChangesText] = useState(initial?.changes.join('\n') ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const changes = changesText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!version.trim() || !releaseDate.trim() || changes.length === 0) {
      setError('Tous les champs sont requis.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ version: version.trim(), release_date: releaseDate.trim(), changes })
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Version</label>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.3.0"
            className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</label>
          <input
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            placeholder="Mai 2026"
            className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Changements <span className="normal-case font-normal">(un par ligne)</span>
        </label>
        <textarea
          value={changesText}
          onChange={(e) => setChangesText(e.target.value)}
          rows={6}
          placeholder="Nouvelle fonctionnalité&#10;Correction de bug&#10;..."
          className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 resize-none font-mono"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={15} /> Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
        >
          <Check size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

// ─── Entry row ────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: AdminChangelog
  onEdit: () => void
  onDelete: () => void
}

function EntryRow({ entry, onEdit, onDelete }: EntryRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-indigo-600 text-lg">v{entry.version}</span>
          <span className="text-sm text-gray-500">{entry.release_date}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Modifier"
          >
            <Pencil size={15} />
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                className="px-2 py-1 rounded-lg text-xs bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {entry.changes.map((change, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-indigo-500 mt-0.5 shrink-0">·</span>
            {change}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ChangelogPage() {
  const [entries, setEntries] = useState<AdminChangelog[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getChangelog()
      .then(setEntries)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(payload: Omit<AdminChangelog, 'id'>) {
    const created = await createChangelogEntry(payload)
    setEntries([created, ...entries])
    setCreating(false)
  }

  async function handleUpdate(id: number, payload: Omit<AdminChangelog, 'id'>) {
    const updated = await updateChangelogEntry(id, payload)
    setEntries(entries.map((e) => (e.id === id ? updated : e)))
    setEditingId(null)
  }

  async function handleDelete(id: number) {
    await deleteChangelogEntry(id)
    setEntries(entries.filter((e) => e.id !== id))
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Changelog</h1>
            <p className="text-sm text-gray-500 mt-0.5">Notes de version affichées dans le footer.</p>
          </div>
          {!creating && (
            <button
              onClick={() => { setCreating(true); setEditingId(null) }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={16} />
              Nouvelle version
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {creating && (
          <div className="mb-4">
            <EntryForm onSave={handleCreate} onCancel={() => setCreating(false)} />
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Chargement…</p>
        ) : entries.length === 0 && !creating ? (
          <p className="text-gray-500 text-sm">Aucune entrée. Ajoutez votre première version.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) =>
              editingId === entry.id ? (
                <EntryForm
                  key={entry.id}
                  initial={entry}
                  onSave={(payload) => handleUpdate(entry.id, payload)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onEdit={() => { setEditingId(entry.id); setCreating(false) }}
                  onDelete={() => handleDelete(entry.id)}
                />
              )
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
