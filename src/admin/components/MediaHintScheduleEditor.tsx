/**
 * Sélection des clés d’indices film/série (aligné sur daily_challenges.hint_schedule).
 */

export const DEFAULT_FILM_HINT_SCHEDULE = ['year', 'director', 'cast'] as const
export const DEFAULT_SERIES_HINT_SCHEDULE = ['year', 'creator', 'cast'] as const

const FILM_KEYS = ['year', 'director', 'genres', 'cast', 'tagline', 'synopsis'] as const
const SERIES_KEYS = ['year', 'creator', 'genres', 'cast', 'tagline', 'synopsis'] as const

const LABELS: Record<string, string> = {
  year: 'Année',
  director: 'Réalisateur',
  creator: 'Créateur',
  genres: 'Genres',
  cast: 'Casting (1er nom)',
  tagline: 'Tagline',
  synopsis: 'Synopsis',
}

export function MediaHintScheduleEditor({
  mode,
  selectedHints,
  onChange,
}: {
  mode: 'film' | 'series'
  selectedHints: string[]
  onChange: (next: string[]) => void
}) {
  const keys = mode === 'film' ? FILM_KEYS : SERIES_KEYS
  const fallback =
    mode === 'film' ? DEFAULT_FILM_HINT_SCHEDULE : DEFAULT_SERIES_HINT_SCHEDULE

  function toggle(key: string, checked: boolean) {
    const base = selectedHints.length > 0 ? selectedHints : [...fallback]
    if (checked) {
      if (base.includes(key)) return
      onChange([...base, key])
      return
    }
    const next = base.filter((k) => k !== key)
    onChange(next.length > 0 ? next : [key])
  }

  const effective = selectedHints.length > 0 ? selectedHints : [...fallback]

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Indices après erreurs (ordre des coches)
      </label>
      <p className="text-xs text-gray-500 leading-relaxed">
        Les trois premières clés cochées correspond aux trois cartes indices en partie. Une nouvelle date au calendrier copie cet ordre depuis la fiche film ou série.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {keys.map((hintKey) => (
          <label key={hintKey} className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={effective.includes(hintKey)}
              onChange={(e) => toggle(hintKey, e.target.checked)}
            />
            {LABELS[hintKey] ?? hintKey}
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100">
        Ordre actuel : {effective.join(' → ') || '—'}
      </p>
    </div>
  )
}
