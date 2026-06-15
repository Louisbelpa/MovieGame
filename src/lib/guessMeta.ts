import type { HintPayload } from '@/api/client'
import type { WikiHintPayload } from '@/api/wikiClient'

const HINT_LABELS: Record<string, string> = {
  year: 'Année',
  genre: 'Genre',
  director: 'Réalisateur',
  creator: 'Créateur',
  actor: 'Acteur',
  synopsis: 'Synopsis',
  country: 'Pays',
}

function hintLabel(type: string): string {
  return HINT_LABELS[type] ?? 'Indice'
}

function formatHintValue(value: unknown): string {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.slice(0, 2).join(', ')
  return String(value)
}

/** Texte secondaire affiché sur une ligne du plateau (style maquette Candy). */
export function guessAttemptMeta(
  index: number,
  guess: { guess: string; correct: boolean },
  hints: Array<HintPayload | WikiHintPayload>,
): string | null {
  if (guess.correct) return null
  if (guess.guess === '') return 'indice débloqué'
  const hint = hints[index]
  if (hint?.value != null && hint.value !== '') {
    return `${hintLabel(hint.type)} · ${formatHintValue(hint.value)}`
  }
  return 'indice débloqué'
}
