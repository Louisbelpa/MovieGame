export type GuessStatus = 'correct' | 'wrong' | 'skipped';
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost' | 'not_found';
export type MediaType = 'film' | 'series' | 'wiki';
export type HintType =
  | 'year' | 'genre' | 'director' | 'creator' | 'actor'
  | 'synopsis' | 'country'
  | 'wiki_birth_year' | 'wiki_nationality' | 'wiki_domain'
  | 'wiki_party' | 'wiki_sport' | 'wiki_clubs' | 'wiki_roles'
  | 'wiki_notable_works' | 'wiki_era' | 'wiki_highlights';

export interface Hint {
  type: HintType;
  value: string | number | string[];
}

export interface GuessEntry {
  guess: string;
  correct: boolean;
  skipped?: boolean;
}

export interface DailyChallenge {
  challengeId: number;
  challengeNumber: number;
  date: string;
  isPastChallenge: boolean;
  mediaType: MediaType;
  imageUrl: string;
  isGameOver: boolean;
  hintsAvailable: number;
  hintsRevealed: number;
  hints: Hint[];
  attemptsUsed: number;
  maxAttempts: number;
  attempts: GuessEntry[];
  outcome: 'won' | 'lost' | null;
  blurLevels: number[];
  hasPrevChallenge?: boolean;
  hasNextChallenge?: boolean;
}

export interface WikiChallenge {
  challengeId: number;
  challengeNumber: number;
  date: string;
  isPastChallenge: boolean;
  mediaType: 'wiki';
  personType: string;
  photoUrl: string | null;
  profile: Record<string, unknown>;
  isGameOver: boolean;
  hintsAvailable: number;
  hintsRevealed: number;
  hints: Hint[];
  attemptsUsed: number;
  maxAttempts: number;
  attempts: GuessEntry[];
  outcome: 'won' | 'lost' | null;
  hasPrevChallenge?: boolean;
  hasNextChallenge?: boolean;
}

export interface GuessResult {
  correct: boolean;
  outcome: 'won' | 'lost' | null;
  attemptsLeft: number;
  nextHintUnlocked: boolean;
  challenge: DailyChallenge;
}

export interface WikiGuessResult {
  correct: boolean;
  outcome: 'won' | 'lost' | null;
  attemptsLeft: number;
  nextHintUnlocked: boolean;
  challenge: WikiChallenge;
}

export interface GameResult {
  outcome: 'won' | 'lost';
  title: string;
  year: number;
  director?: string;
  creator?: string;
  genres: string[];
  cast: string[];
  tagline: string | null;
  synopsis: string | null;
  imageUrl: string;
  tmdbId: number | null;
  mediaType?: MediaType;
  attemptsUsed: number;
  maxAttempts: number;
  attempts: GuessEntry[];
  startedAt: string;
  finishedAt: string;
}

export interface WikiGameResult {
  outcome: 'won' | 'lost';
  name: string;
  personType: string;
  photoUrl: string | null;
  attemptsUsed: number;
  maxAttempts: number;
  attempts: GuessEntry[];
  startedAt: string;
  finishedAt: string;
}

export interface GlobalStats {
  totalGames: number;
  totalWins: number;
  averageAttempts: number;
  distribution: Record<string, number>;
}

export interface SearchResult {
  id: number;
  title: string;
  year: number;
}

export interface WikiSearchResult {
  id: number;
  name: string;
  personType: string;
}

export interface PersistedGameState {
  challengeId: number;
  guesses: GuessEntry[];
  status: GameStatus;
  blurIndex: number;
  hintsRevealed: number;
  date: string;
}

export interface PersonalStats {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<string, number>;
}
