// ─── Core domain types ──────────────────────────────────────────────────────

export type GuessStatus = 'correct' | 'wrong' | 'skipped'

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost' | 'not_found'

export type HintType =
  | 'year'
  | 'genre'
  | 'director'
  | 'actor'
  | 'synopsis'
  | 'country'

// ─── API response shapes ─────────────────────────────────────────────────────

/** Single hint revealed progressively */
export interface Hint {
  type: HintType
  label: string  // e.g. "Réalisateur"
  value: string  // e.g. "Christopher Nolan"
}

/** Daily challenge returned by the API */
export interface DailyChallenge {
  id: string            // "2026-04-25"
  date: string          // ISO date
  imageUrl: string      // CDN URL of the movie still
  /** Blur levels keyed by attempt index 0-5. 0 = max blur, 5 = clear */
  blurLevels: number[]  // e.g. [24, 18, 12, 8, 4, 0]
  hints: Hint[]         // max 5 hints (one unlocked per wrong attempt 1-5)
  totalAttempts: number // always 6
}

/** One entry in the autocomplete dropdown */
export interface MovieSuggestion {
  id: string
  title: string
  year: number
  posterUrl?: string
}

/** Paginated autocomplete response */
export interface SearchResponse {
  suggestions: MovieSuggestion[]
  total: number
}

/** Result revealed after game ends */
export interface GameResult {
  movieTitle: string
  movieYear: number
  director: string
  posterUrl: string
  synopsis: string
  trailerUrl?: string
}

// ─── Game state ───────────────────────────────────────────────────────────────

export interface GuessEntry {
  value: string
  status: GuessStatus
  timestamp: number
}

/** Shape persisted in localStorage for the current day */
export interface PersistedGameState {
  challengeId: string     // date string, used to detect new day
  guesses: GuessEntry[]
  hintsUnlocked: number   // index of last revealed hint (0 = none)
  status: GameStatus
  blurIndex: number       // current blur level index (0 = most blurred)
  completedAt?: number    // timestamp when game ended
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface GameStats {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  maxStreak: number
  /** Distribution of wins by attempt number (index = attempt count 1-6) */
  guessDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>
  lastPlayedDate?: string
  lastWonDate?: string
}

// ─── UI state ─────────────────────────────────────────────────────────────────

export interface UIState {
  isModalOpen: boolean
  modalType: 'win' | 'lose' | 'stats' | 'rules' | 'archive' | null
  isSearchOpen: boolean
  inputValue: string
  shakeTrigger: number  // increment to re-trigger shake animation
}

// ─── Store shape (Zustand) ────────────────────────────────────────────────────

export interface GameStore {
  // Data
  challenge: DailyChallenge | null
  gameState: PersistedGameState | null
  result: GameResult | null
  stats: GameStats

  // UI
  ui: UIState

  // Actions
  initGame: () => Promise<void>
  submitGuess: (guess: string) => void
  skipAttempt: () => void
  openModal: (type: UIState['modalType']) => void
  closeModal: () => void
  setInputValue: (value: string) => void
  shareResult: () => void
}
