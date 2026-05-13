import { create } from 'zustand';
import { challengeApi } from '../api/client';
import { gameStorage } from '../lib/storage';
import { getTodayParis } from '../lib/paris';
import type {
  DailyChallenge,
  GameResult,
  GameStatus,
  GuessEntry,
  MediaType,
  PersonalStats,
} from '../types';

interface ModalState {
  type: 'win' | 'lose' | 'stats' | 'rules' | 'archive' | null;
}

interface GameState {
  mediaType: MediaType;
  challenge: DailyChallenge | null;
  result: GameResult | null;
  status: GameStatus;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  viewingDate: string | null;
  inputValue: string;
  suggestions: { id: number; title: string; year: number }[];
  isSuggestionsLoading: boolean;
  shakeTrigger: number;
  modal: ModalState;
  personalStats: PersonalStats | null;

  setMediaType: (type: MediaType) => void;
  initGame: () => Promise<void>;
  loadDate: (date: string) => Promise<void>;
  navigateDate: (direction: 'prev' | 'next') => Promise<void>;
  submitGuess: (guess: string) => Promise<void>;
  skipAttempt: () => Promise<void>;
  searchSuggestions: (q: string) => Promise<void>;
  clearSuggestions: () => void;
  setInputValue: (v: string) => void;
  openModal: (type: ModalState['type']) => void;
  closeModal: () => void;
  resetError: () => void;
  loadStats: () => Promise<void>;
}

function defaultStats(): PersonalStats {
  return { gamesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: {} };
}

async function persistState(
  mediaType: string,
  challenge: DailyChallenge,
  status: GameStatus,
  hintsRevealed: number,
) {
  const blurIndex = challenge.attemptsUsed;
  await gameStorage.setState(mediaType, {
    challengeId: challenge.challengeId,
    guesses: challenge.attempts,
    status,
    blurIndex,
    hintsRevealed,
    date: challenge.date,
  });
}

async function updateStats(
  mediaType: string,
  outcome: 'won' | 'lost',
  attemptsUsed: number,
): Promise<PersonalStats> {
  const existing = (await gameStorage.getStats(mediaType)) ?? defaultStats();
  const updated: PersonalStats = {
    ...existing,
    gamesPlayed: existing.gamesPlayed + 1,
    wins: outcome === 'won' ? existing.wins + 1 : existing.wins,
    currentStreak:
      outcome === 'won' ? existing.currentStreak + 1 : 0,
    maxStreak:
      outcome === 'won'
        ? Math.max(existing.maxStreak, existing.currentStreak + 1)
        : existing.maxStreak,
    distribution: {
      ...existing.distribution,
      [attemptsUsed]: (existing.distribution[attemptsUsed] ?? 0) + 1,
    },
  };
  await gameStorage.setStats(mediaType, updated);
  return updated;
}

export const useGameStore = create<GameState>((set, get) => ({
  mediaType: 'film',
  challenge: null,
  result: null,
  status: 'idle',
  isLoading: false,
  isSubmitting: false,
  error: null,
  viewingDate: null,
  inputValue: '',
  suggestions: [],
  isSuggestionsLoading: false,
  shakeTrigger: 0,
  modal: { type: null },
  personalStats: null,

  setMediaType: (type) => {
    set({ mediaType: type, challenge: null, result: null, status: 'idle', viewingDate: null });
    get().initGame();
  },

  initGame: async () => {
    const { mediaType } = get();
    const today = getTodayParis();
    set({ isLoading: true, error: null, viewingDate: null });
    try {
      const challenge = await challengeApi.getToday(mediaType as 'film' | 'series');
      const persisted = await gameStorage.getState(mediaType);
      let status: GameStatus = 'playing';
      if (
        persisted &&
        persisted.challengeId === challenge.challengeId &&
        persisted.date === today
      ) {
        status = persisted.status;
      }
      set({ challenge, status, isLoading: false });
      if (status === 'won' || status === 'lost') {
        set({ modal: { type: status === 'won' ? 'win' : 'lose' } });
      }
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      set({
        isLoading: false,
        status: err.status === 404 ? 'not_found' : 'idle',
        error: err.message ?? 'Erreur réseau',
      });
    }
  },

  loadDate: async (date) => {
    const { mediaType } = get();
    set({ isLoading: true, error: null, viewingDate: date });
    try {
      const challenge = await challengeApi.getByDate(date, mediaType as 'film' | 'series');
      set({ challenge, status: challenge.isGameOver ? 'lost' : 'playing', isLoading: false });
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      set({
        isLoading: false,
        status: err.status === 404 ? 'not_found' : 'idle',
        error: err.message ?? 'Erreur réseau',
      });
    }
  },

  navigateDate: async (direction) => {
    const { challenge, viewingDate, mediaType } = get();
    const date = viewingDate ?? challenge?.date;
    if (!date) return;
    set({ isLoading: true, error: null });
    try {
      const { date: nextDate } = await challengeApi.getAdjacent(
        date,
        direction,
        mediaType as 'film' | 'series',
      );
      await get().loadDate(nextDate);
    } catch {
      set({ isLoading: false });
    }
  },

  submitGuess: async (guess) => {
    const { challenge, mediaType, status } = get();
    if (!challenge || status !== 'playing') return;
    set({ isSubmitting: true, inputValue: '', suggestions: [] });
    try {
      const result = await challengeApi.submitGuess(challenge.challengeId, guess);
      const newStatus: GameStatus = result.outcome === 'won'
        ? 'won'
        : result.outcome === 'lost'
          ? 'lost'
          : 'playing';

      if (!result.correct && result.outcome === null) {
        set((s) => ({ shakeTrigger: s.shakeTrigger + 1 }));
      }

      set({ challenge: result.challenge, status: newStatus, isSubmitting: false });

      await persistState(mediaType, result.challenge, newStatus, result.challenge.hintsRevealed);

      if (result.outcome) {
        const stats = await updateStats(mediaType, result.outcome, result.challenge.attemptsUsed);
        set({ personalStats: stats });
        setTimeout(() => set({ modal: { type: newStatus as 'win' | 'lose' } }), 800);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      set({ isSubmitting: false, error: err.message ?? 'Erreur réseau' });
    }
  },

  skipAttempt: () => get().submitGuess(''),

  searchSuggestions: async (q) => {
    if (q.length < 2) {
      set({ suggestions: [], isSuggestionsLoading: false });
      return;
    }
    const { mediaType } = get();
    set({ isSuggestionsLoading: true });
    try {
      const results =
        mediaType === 'series'
          ? await challengeApi.searchSeries(q)
          : await challengeApi.searchFilms(q);
      set({ suggestions: results, isSuggestionsLoading: false });
    } catch {
      set({ suggestions: [], isSuggestionsLoading: false });
    }
  },

  clearSuggestions: () => set({ suggestions: [], inputValue: '' }),

  setInputValue: (v) => set({ inputValue: v }),

  openModal: (type) => set({ modal: { type } }),

  closeModal: () => set({ modal: { type: null } }),

  resetError: () => set({ error: null }),

  loadStats: async () => {
    const { mediaType } = get();
    const stats = (await gameStorage.getStats(mediaType)) ?? defaultStats();
    set({ personalStats: stats });
  },
}));
