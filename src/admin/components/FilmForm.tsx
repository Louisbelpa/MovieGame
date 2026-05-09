/**
 * admin/components/FilmForm.tsx
 * Reusable form for creating / editing a film.
 * Supports TMDB title search with auto-fill.
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { X, Images, Search, Loader2, Upload, Shuffle } from 'lucide-react'
import type { AdminFilm, FilmPayload, TmdbSearchResult } from '../api'
import { searchTmdb, getTmdbFilmDetails, uploadImage, getRandomTmdbFilm } from '../api'
import { BackdropPicker } from './BackdropPicker'

function resolvePreviewUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('/uploads/')) return url
  return `https://image.tmdb.org/t/p/w300${url}`
}

interface FilmFormProps {
  initial?: Partial<AdminFilm>
  onSubmit: (payload: FilmPayload) => Promise<void>
  onCancel: () => void
}

// ─── Tags Input ───────────────────────────────────────────────────────────────

interface TagsInputProps {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

function TagsInput({ label, tags, onChange, placeholder }: TagsInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(value: string) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className="flex flex-wrap gap-1.5 min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm cursor-text focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-md px-2 py-0.5 text-xs font-medium">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} className="hover:text-indigo-900">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input) addTag(input) }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-gray-800 placeholder-gray-400"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">Appuie sur Entrée ou virgule pour ajouter</p>
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  id: string
  required?: boolean
  type?: string
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
}

function Field({ label, id, required, type = 'text', value, onChange, placeholder }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id} type={type} required={required}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      />
    </div>
  )
}

function TextareaField({ label, id, value, onChange, placeholder }: Omit<FieldProps, 'type'>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        id={id} rows={3}
        value={value as string} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-vertical"
      />
    </div>
  )
}

// ─── TMDB Search ──────────────────────────────────────────────────────────────

interface TmdbSearchProps {
  onSelect: (details: FilmPayload) => void
}

function TmdbSearch({ onSelect }: TmdbSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchTmdb(query)
        setResults(res)
        setOpen(res.length > 0)
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function handleSelect(result: TmdbSearchResult) {
    setLoadingId(result.tmdb_id)
    setOpen(false)
    try {
      const details = await getTmdbFilmDetails(result.tmdb_id)
      onSelect(details)
      setQuery('')
      setResults([])
    } catch {
      // ignore
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Rechercher sur TMDB
        <span className="ml-1 text-xs font-normal text-gray-400">(auto-remplissage)</span>
      </label>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        {(searching || loadingId !== null) && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Chercher un film par titre…"
          className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r) => (
            <li key={r.tmdb_id}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                disabled={loadingId === r.tmdb_id}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 text-left transition-colors disabled:opacity-50"
              >
                {r.poster_url ? (
                  <img src={r.poster_url} alt={r.title} className="w-8 h-11 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-8 h-11 bg-gray-100 rounded shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                  {r.original_title !== r.title && (
                    <p className="text-xs text-gray-400 truncate">{r.original_title}</p>
                  )}
                  <p className="text-xs text-gray-400">{r.year}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── FilmForm ─────────────────────────────────────────────────────────────────

export function FilmForm({ initial, onSubmit, onCancel }: FilmFormProps) {
  const [form, setForm] = useState<FilmPayload>({
    title: initial?.title ?? '',
    title_aliases: initial?.title_aliases ?? [],
    year: initial?.year ?? new Date().getFullYear(),
    director: initial?.director ?? '',
    genres: initial?.genres ?? [],
    cast_members: initial?.cast_members ?? [],
    tagline: initial?.tagline ?? '',
    synopsis: initial?.synopsis ?? '',
    image_url: initial?.image_url ?? '',
    tmdb_id: initial?.tmdb_id ?? null,
    is_active: initial?.is_active ?? true,
    fame_level: initial?.fame_level ?? 3,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBackdrops, setShowBackdrops] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [randomLoading, setRandomLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleRandom() {
    setRandomLoading(true)
    setError(null)
    try {
      const details = await getRandomTmdbFilm()
      setForm({ ...details, is_active: form.is_active })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération aléatoire')
    } finally {
      setRandomLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setField('image_url', url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function setField<K extends keyof FilmPayload>(key: K, value: FilmPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleTmdbFill(details: FilmPayload) {
    setForm({
      ...details,
      is_active: form.is_active,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* TMDB search (only shown for new films) */}
      {!initial?.id && (
        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 space-y-2">
          <TmdbSearch onSelect={handleTmdbFill} />
          <button
            type="button"
            onClick={handleRandom}
            disabled={randomLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 bg-white rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {randomLoading
              ? <Loader2 size={13} className="animate-spin" />
              : <Shuffle size={13} />
            }
            Film aléatoire
          </button>
        </div>
      )}

      {/* Row: title + year */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
        <div className="col-span-2">
          <Field label="Titre" id="title" required value={form.title} onChange={(v) => setField('title', v)} placeholder="Ex: Inception" />
        </div>
        <Field label="Année" id="year" required type="number" value={form.year} onChange={(v) => setField('year', parseInt(v, 10) || 0)} placeholder="2010" />
      </div>

      <Field label="Réalisateur" id="director" required value={form.director} onChange={(v) => setField('director', v)} placeholder="Ex: Christopher Nolan" />

      <TagsInput label="Titres alternatifs" tags={form.title_aliases} onChange={(tags) => setField('title_aliases', tags)} placeholder="Ajouter un alias..." />
      <TagsInput label="Genres" tags={form.genres} onChange={(tags) => setField('genres', tags)} placeholder="Action, Drame..." />
      <TagsInput label="Casting" tags={form.cast_members} onChange={(tags) => setField('cast_members', tags)} placeholder="Ajouter un acteur..." />

      <Field label="Tagline" id="tagline" value={form.tagline} onChange={(v) => setField('tagline', v)} placeholder="La phrase d'accroche du film" />
      <TextareaField label="Synopsis" id="synopsis" value={form.synopsis} onChange={(v) => setField('synopsis', v)} placeholder="Résumé du film..." />

      {/* Image URL + preview */}
      <div>
        <Field label="URL de l'image" id="image_url" required value={form.image_url} onChange={(v) => setField('image_url', v)} placeholder="https://..." />
        <div className="flex gap-2 mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Upload…' : 'Importer'}
          </button>
          {form.tmdb_id && (
            <button
              type="button"
              onClick={() => setShowBackdrops(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
            >
              <Images size={15} />
              Backdrops TMDB
            </button>
          )}
        </div>
        {form.image_url && (
          <div className="mt-2">
            <img
              src={resolvePreviewUrl(form.image_url)}
              alt="Aperçu"
              className="h-32 w-auto rounded-lg object-cover border border-gray-200"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}
      </div>

      {showBackdrops && form.tmdb_id && (
        <BackdropPicker
          tmdbId={form.tmdb_id}
          onSelect={(url) => setField('image_url', url)}
          onClose={() => setShowBackdrops(false)}
        />
      )}

      <Field label="TMDB ID" id="tmdb_id" type="number" value={form.tmdb_id ?? ''} onChange={(v) => setField('tmdb_id', v ? parseInt(v, 10) : null)} placeholder="Optionnel" />

      {/* Fame level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Niveau de célébrité <span className="font-normal text-gray-400">(1 = film de niche · 5 = blockbuster)</span>
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setField('fame_level', n)}
              className={`text-xl transition-colors ${
                n <= form.fame_level ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-300'
              }`}
              title={`${n} étoile${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setField('is_active', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700">Film actif</span>
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} disabled={submitting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
          Annuler
        </button>
        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {initial?.id ? 'Enregistrer' : 'Créer le film'}
        </button>
      </div>
    </form>
  )
}
