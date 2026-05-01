import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, X, WandSparkles, ExternalLink, Trash2, Pencil, Shuffle } from 'lucide-react'
import {
  getWikiPersons,
  createWikiPerson,
  updateWikiPerson,
  deleteWikiPerson,
  fetchWikipediaPerson,
  type AdminWikiPerson,
  type WikiPersonPayload,
} from '../api'
import { AdminLayout } from '../components/AdminLayout'

const RANDOM_WIKI_SLUGS = [
  'Emmanuel_Macron',
  'Barack_Obama',
  'Angela_Merkel',
  'Nelson_Mandela',
  'Volodymyr_Zelenskyy',
  'Lionel_Messi',
  'Cristiano_Ronaldo',
  'Kylian_Mbappé',
  'Zinedine_Zidane',
  'Rafael_Nadal',
  'Serena_Williams',
  'Michael_Jordan',
]

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; person: AdminWikiPerson }
  | { type: 'delete'; person: AdminWikiPerson }
  | null

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4 sm:my-8">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-4">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
      </div>
    </div>
  )
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON objet invalide')
  return parsed as Record<string, unknown>
}

function parseJsonStringArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown
  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === 'string')) throw new Error('JSON tableau de strings invalide')
  return parsed
}

function WikiPersonForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: AdminWikiPerson
  onSubmit: (payload: WikiPersonPayload) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.wikipedia_slug ?? '')
  const [personType, setPersonType] = useState<'politician' | 'sportsperson'>(initial?.person_type ?? 'politician')
  const [aliases, setAliases] = useState(JSON.stringify(initial?.name_aliases ?? [], null, 2))
  const [infoboxData, setInfoboxData] = useState(JSON.stringify(initial?.infobox_data ?? {}, null, 2))
  const [hintSchedule, setHintSchedule] = useState(JSON.stringify(initial?.hint_schedule ?? [], null, 2))
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? '')
  const [extract, setExtract] = useState(initial?.extract ?? '')
  const [wikipediaUrl, setWikipediaUrl] = useState(initial?.wikipedia_url ?? '')
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3)
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [loadingWiki, setLoadingWiki] = useState(false)
  const [loadingRandomWiki, setLoadingRandomWiki] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFetchWikipedia() {
    if (!slug.trim()) {
      setError('Le slug Wikipedia est requis pour l’auto-remplissage.')
      return
    }
    setLoadingWiki(true)
    setError(null)
    try {
      const data = await fetchWikipediaPerson(slug.trim(), 'fr')
      setName(data.name)
      setPersonType(data.person_type)
      setInfoboxData(JSON.stringify(data.infobox_data, null, 2))
      setHintSchedule(JSON.stringify(data.hint_schedule, null, 2))
      setPhotoUrl(data.photo_url ?? '')
      setExtract(data.extract ?? '')
      setWikipediaUrl(data.wikipedia_url ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur auto-remplissage Wikipedia')
    } finally {
      setLoadingWiki(false)
    }
  }

  async function handleRandomWikipedia() {
    const randomSlug = RANDOM_WIKI_SLUGS[Math.floor(Math.random() * RANDOM_WIKI_SLUGS.length)]
    setLoadingRandomWiki(true)
    setError(null)
    try {
      setSlug(randomSlug)
      const data = await fetchWikipediaPerson(randomSlug, 'fr')
      setName(data.name)
      setPersonType(data.person_type)
      setInfoboxData(JSON.stringify(data.infobox_data, null, 2))
      setHintSchedule(JSON.stringify(data.hint_schedule, null, 2))
      setPhotoUrl(data.photo_url ?? '')
      setExtract(data.extract ?? '')
      setWikipediaUrl(data.wikipedia_url ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur wikipedia aléatoire')
    } finally {
      setLoadingRandomWiki(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload: WikiPersonPayload = {
        name: name.trim(),
        wikipedia_slug: slug.trim(),
        person_type: personType,
        name_aliases: parseJsonStringArray(aliases),
        infobox_data: parseJsonObject(infoboxData),
        hint_schedule: parseJsonStringArray(hintSchedule),
        photo_url: photoUrl.trim() || null,
        extract: extract.trim() || null,
        wikipedia_url: wikipediaUrl.trim() || null,
        difficulty: Math.min(5, Math.max(1, difficulty)),
        is_active: isActive,
      }
      if (!payload.name || !payload.wikipedia_slug) throw new Error('Nom et slug Wikipedia sont obligatoires.')
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug Wikipedia</label>
          <div className="flex gap-2">
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="button" onClick={handleFetchWikipedia} disabled={loadingWiki || loadingRandomWiki} className="px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 inline-flex items-center gap-1.5">
              <WandSparkles size={14} />
              {loadingWiki ? 'Chargement…' : 'Wiki'}
            </button>
            {!initial && (
              <button
                type="button"
                onClick={handleRandomWikipedia}
                disabled={loadingWiki || loadingRandomWiki}
                className="px-3 py-2 text-xs font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Shuffle size={14} />
                {loadingRandomWiki ? 'Aléatoire…' : 'Au hasard'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={personType} onChange={(e) => setPersonType(e.target.value as 'politician' | 'sportsperson')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="politician">Politicien</option>
            <option value="sportsperson">Sportif</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulté (1-5)</label>
          <input type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value, 10) || 3)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 mt-7 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Actif
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alias (JSON string[])</label>
        <textarea rows={3} value={aliases} onChange={(e) => setAliases(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hint schedule (JSON string[])</label>
        <textarea rows={3} value={hintSchedule} onChange={(e) => setHintSchedule(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Infobox data (JSON object)</label>
        <textarea rows={8} value={infoboxData} onChange={(e) => setInfoboxData(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
          <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wikipedia URL</label>
          <input value={wikipediaUrl} onChange={(e) => setWikipediaUrl(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Extrait</label>
        <textarea rows={3} value={extract} onChange={(e) => setExtract(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {initial ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

export function WikiPersonsPage() {
  const [persons, setPersons] = useState<AdminWikiPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>(null)

  const load = useCallback(() => {
    setLoading(true)
    getWikiPersons({ q: search.trim() || undefined, limit: 100 })
      .then((res) => setPersons(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(payload: WikiPersonPayload) {
    await createWikiPerson(payload)
    setModal(null)
    load()
  }

  async function handleEdit(payload: WikiPersonPayload) {
    if (modal?.type !== 'edit') return
    await updateWikiPerson(modal.person.id, payload)
    setModal(null)
    load()
  }

  async function handleDelete() {
    if (modal?.type !== 'delete') return
    await deleteWikiPerson(modal.person.id)
    setModal(null)
    load()
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une personnalité..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-36 flex items-center justify-center"><span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : persons.length === 0 ? (
          <div className="h-36 flex items-center justify-center text-sm text-gray-400">Aucune personnalité trouvée.</div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-3">Nom</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3">Défis</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {persons.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="font-medium text-sm text-gray-900">{person.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                      {person.wikipedia_slug}
                      {person.wikipedia_url && <a href={person.wikipedia_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700"><ExternalLink size={12} /></a>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{person.person_type === 'politician' ? 'Politicien' : 'Sportif'}</td>
                  <td className="px-3 py-3 text-sm">
                    <span className={person.is_active ? 'text-emerald-700' : 'text-gray-500'}>{person.is_active ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{person.used_dates.length}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end items-center gap-1">
                      <button onClick={() => setModal({ type: 'edit', person })} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={14} /></button>
                      <button onClick={() => setModal({ type: 'delete', person })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === 'create' && (
        <Modal title="Ajouter une personnalité Wikipedia" onClose={() => setModal(null)}>
          <WikiPersonForm onSubmit={handleCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title={`Modifier — ${modal.person.name}`} onClose={() => setModal(null)}>
          <WikiPersonForm initial={modal.person} onSubmit={handleEdit} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal title="Supprimer la personnalité" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Confirmer la désactivation de <strong className="text-gray-900">« {modal.person.name} »</strong> ?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Supprimer</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}
