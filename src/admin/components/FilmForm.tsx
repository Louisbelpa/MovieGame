/**
 * admin/components/FilmForm.tsx
 * Reusable form for creating / editing a film.
 * Supports tags input for arrays fields.
 */

import { useState, useRef, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import type { AdminFilm, FilmPayload } from '../api'

function resolvePreviewUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
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

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div
        className="flex flex-wrap gap-1.5 min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm cursor-text focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-md px-2 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="hover:text-indigo-900"
            >
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
      <p className="mt-1 text-xs text-gray-400">
        Appuie sur Entrée ou virgule pour ajouter
      </p>
    </div>
  )
}

// ─── TextField ────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  id: string
  required?: boolean
  type?: string
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
}

function Field({
  label,
  id,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      />
    </div>
  )
}

function TextareaField({
  label,
  id,
  value,
  onChange,
  placeholder,
}: Omit<FieldProps, 'type'>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-vertical"
      />
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
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FilmPayload>(key: K, value: FilmPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      {/* Row: title + year */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Field
            label="Titre"
            id="title"
            required
            value={form.title}
            onChange={(v) => set('title', v)}
            placeholder="Ex: Inception"
          />
        </div>
        <Field
          label="Année"
          id="year"
          required
          type="number"
          value={form.year}
          onChange={(v) => set('year', parseInt(v, 10) || 0)}
          placeholder="2010"
        />
      </div>

      <Field
        label="Réalisateur"
        id="director"
        required
        value={form.director}
        onChange={(v) => set('director', v)}
        placeholder="Ex: Christopher Nolan"
      />

      <TagsInput
        label="Titres alternatifs"
        tags={form.title_aliases}
        onChange={(tags) => set('title_aliases', tags)}
        placeholder="Ajouter un alias..."
      />

      <TagsInput
        label="Genres"
        tags={form.genres}
        onChange={(tags) => set('genres', tags)}
        placeholder="Action, Drame..."
      />

      <TagsInput
        label="Casting"
        tags={form.cast_members}
        onChange={(tags) => set('cast_members', tags)}
        placeholder="Ajouter un acteur..."
      />

      <Field
        label="Tagline"
        id="tagline"
        value={form.tagline}
        onChange={(v) => set('tagline', v)}
        placeholder="La phrase d'accroche du film"
      />

      <TextareaField
        label="Synopsis"
        id="synopsis"
        value={form.synopsis}
        onChange={(v) => set('synopsis', v)}
        placeholder="Résumé du film..."
      />

      {/* Image URL + preview */}
      <div>
        <Field
          label="URL de l'image"
          id="image_url"
          required
          value={form.image_url}
          onChange={(v) => set('image_url', v)}
          placeholder="https://..."
        />
        {form.image_url && (
          <div className="mt-2">
            <img
              src={resolvePreviewUrl(form.image_url)}
              alt="Aperçu"
              className="h-32 w-auto rounded-lg object-cover border border-gray-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
      </div>

      <Field
        label="TMDB ID"
        id="tmdb_id"
        type="number"
        value={form.tmdb_id ?? ''}
        onChange={(v) => set('tmdb_id', v ? parseInt(v, 10) : null)}
        placeholder="Optionnel"
      />

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700">Film actif</span>
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {initial ? 'Enregistrer' : 'Créer le film'}
        </button>
      </div>
    </form>
  )
}
