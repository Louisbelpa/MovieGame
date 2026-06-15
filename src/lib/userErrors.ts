/**
 * Messages d'erreur affichés aux joueurs — toujours en français.
 */

const EXACT: Record<string, string> = {
  // Auth
  'Invalid credentials': 'E-mail ou mot de passe incorrect.',
  'Invalid email address': 'Adresse e-mail invalide.',
  'Password must be at least 8 characters': 'Le mot de passe doit contenir au moins 8 caractères.',
  'Display name must be between 1 and 50 characters': 'Le pseudo doit contenir entre 1 et 50 caractères.',
  'Email already registered': 'Cette adresse e-mail est déjà utilisée.',
  'Email and password are required': "L'e-mail et le mot de passe sont requis.",
  'Not authenticated': 'Session expirée. Reconnecte-toi.',
  'Invalid avatarUrl': "URL d'avatar invalide.",
  'No file uploaded': 'Aucune image envoyée.',
  'Only JPEG, PNG and WebP images are allowed': 'Formats acceptés : JPEG, PNG ou WebP.',
  'Invalid provider or providerId': 'Connexion externe invalide.',
  'Account suspended': 'Compte suspendu.',
  'Invalid Apple identity token': 'Connexion Apple invalide. Réessaie.',
  'identityToken is required': 'Connexion Apple incomplète. Réessaie.',

  // Amis
  'code is required': 'Code ami requis.',
  'User not found': 'Joueur introuvable.',
  'Cannot add yourself': 'Tu ne peux pas t\'ajouter toi-même.',
  'Friendship already exists or pending': 'Cette amitié existe déjà ou est en attente.',
  'userId must be a positive integer': 'Identifiant invalide.',
  'Pending friendship not found': 'Demande d\'amitié introuvable.',
  'Invalid userId': 'Identifiant invalide.',

  // Jeu
  'Date must be in YYYY-MM-DD format.': 'Date invalide.',
  'Cannot access future challenges.': 'Ce défi n\'est pas encore disponible.',
  'Field "guess" must be a string (use empty string to skip).': 'Réponse invalide.',
  'Field "guess" must be a string.': 'Réponse invalide.',
  'Field "guess" must be 300 characters or fewer.': 'Réponse trop longue (300 caractères max).',
  'Invalid challengeId.': 'Défi introuvable.',
  'Invalid challengeId': 'Défi introuvable.',
  'date must be YYYY-MM-DD': 'Date invalide.',
  'direction must be "prev" or "next"': 'Navigation invalide.',
  'No adjacent challenge found.': 'Aucun défi adjacent trouvé.',
  'Challenge not found': 'Défi introuvable.',

  // Rate limit
  'Too many requests, please slow down.': 'Trop de requêtes. Patiente un instant.',
  'Request failed': 'La requête a échoué.',
  Error: 'Une erreur est survenue.',
}

function isLikelyUserFacingFrench(text: string): boolean {
  if (/[àâäéèêëïîôùûüçœæ]/i.test(text)) return true
  return /^(Le |La |L'|Les |Ce |Cette |Ton |Tu |Veuillez|Impossible|Aucun|Session |E-mail |Données |Trop de |Erreur |Joueur |Défi |Réponse |Formats acceptés|Code ami|Compte )/.test(text)
}

function statusFallback(status: number | undefined, context?: string): string {
  if (status === 401) {
    return context === 'auth'
      ? 'E-mail ou mot de passe incorrect.'
      : 'Session expirée. Reconnecte-toi.'
  }
  if (status === 403) return 'Accès refusé.'
  if (status === 404) return 'Élément introuvable.'
  if (status === 409) return 'Cette action est impossible pour le moment.'
  if (status === 422) return 'Données invalides.'
  if (status === 429) return 'Trop de requêtes. Patiente un instant.'
  if (status != null && status >= 500) return 'Erreur serveur. Réessaie plus tard.'
  return 'Une erreur est survenue. Réessaie dans un instant.'
}

/** Convertit un message API (souvent en anglais) en libellé joueur en français. */
export function toUserErrorMessage(
  raw: unknown,
  fallback?: string,
  options?: { status?: number; context?: 'auth' | 'game' | 'friends' },
): string {
  const defaultFallback = fallback ?? statusFallback(options?.status)

  if (raw instanceof Error) {
    return toUserErrorMessage(raw.message, defaultFallback, options)
  }

  if (typeof raw !== 'string') return defaultFallback

  const trimmed = raw.trim()
  if (!trimmed) return defaultFallback

  if (EXACT[trimmed]) return EXACT[trimmed]

  const insensitive = Object.keys(EXACT).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase(),
  )
  if (insensitive) return EXACT[insensitive]

  if (/^HTTP \d{3}$/.test(trimmed)) {
    return statusFallback(options?.status ?? Number(trimmed.slice(5)), options?.context)
  }

  // Déjà en français (messages backend récents)
  if (isLikelyUserFacingFrench(trimmed)) return trimmed

  if (options?.status != null) {
    return statusFallback(options.status, options.context)
  }

  return defaultFallback
}

export function userErrorFromResponse(
  status: number,
  body: { message?: string; error?: string } | null | undefined,
  fallback?: string,
  context?: 'auth' | 'game' | 'friends',
): string {
  const raw = body?.message ?? body?.error
  return toUserErrorMessage(raw, fallback ?? statusFallback(status, context), { status, context })
}
