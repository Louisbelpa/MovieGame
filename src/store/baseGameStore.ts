import { create } from 'zustand'
import { addToHistory, loadStats, saveStats, saveGameState } from '@/lib/storage'
import { updateStats } from '@/lib/utils'
import { toUserErrorMessage, userErrorFromResponse } from '@/lib/userErrors'
import { authChallengeResult } from '@/api/client'
import { useAuthStore } from '@/store/authStore'

type BaseOutcome = 'won' | 'lost' | null

interface BaseAttemptPayload {
  guess: string
  correct: boolean
}

interface BaseChallengePayloadLike {
  challengeId: number
  challengeNumber?: number
  mediaType?: string
  personType?: string
  imageUrl?: string | null
  photoUrl?: string | null
  profile?: unknown
  extract?: string | null
  hints?: unknown[]
  maxAttempts?: number
  isPastChallenge?: boolean
  date: string
  isGameOver: boolean
  hintsRevealed: number
  hintsAvailable?: number
  attempts: BaseAttemptPayload[]
  outcome: BaseOutcome
  hasPrevChallenge?: boolean
  hasNextChallenge?: boolean
}

interface BaseGuessResponse<TPayload> {
  correct: boolean
  challenge: TPayload
  outcome: BaseOutcome
}

interface AdjacentDateResponse {
  date: string
}

export interface BaseGameState<TChallenge, TGuess> {
  challenge: TChallenge | null
  guesses: TGuess[]
  hintsRevealed: number
  status: 'idle' | 'playing' | 'won' | 'lost' | 'not_found'
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  isGameOver: boolean
  gameType: 'film' | 'series' | 'wiki'
  viewingDate: string | null
  hasPrev: boolean
  hasNext: boolean
  ui: {
    isModalOpen: boolean
    modalType: 'win' | 'lose' | 'stats' | 'rules' | 'archive' | null
    inputValue: string
    shakeTrigger: number
  }
}

export interface BaseGameActions {
  setGameType: (type: BaseGameState<unknown, unknown>['gameType']) => void
  initGame: () => Promise<void>
  loadDate: (date: string) => Promise<void>
  navigateDate: (direction: 'prev' | 'next') => Promise<void>
  submitGuess: (guess: string) => Promise<void>
  skipAttempt: () => Promise<void>
  revealHint: () => void
  resetError: () => void
  openModal: (type: BaseGameState<unknown, unknown>['ui']['modalType']) => void
  closeModal: () => void
  setInputValue: (value: string) => void
}

export function createBaseGameStore<
  TChallenge extends { hintsAvailable?: number },
  TGuess,
  TPayload extends BaseChallengePayloadLike
>(
  config: {
    mediaType: string
    apiBase: string
    buildChallengeFromPayload: (payload: TPayload) => TChallenge
    buildGuessFromAttempt: (attempt: BaseAttemptPayload) => TGuess
  }
) {
  const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const currentType: 'film' | 'series' =
      currentPath.startsWith('/series') ? 'series' : 'film'
    const shouldAttachType =
      config.apiBase === '/api/challenge' &&
      (path.startsWith('/today') || path.startsWith('/date/') || path.startsWith('/adjacent'))
    const separator = path.includes('?') ? '&' : '?'
    const resolvedPath = shouldAttachType ? `${path}${separator}type=${currentType}` : path

    const res = await fetch(`${config.apiBase}${resolvedPath}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      const err = new Error(userErrorFromResponse(res.status, body, undefined, 'game'))
      ;(err as Error & { status?: number }).status = res.status
      throw err
    }

    return res.json() as Promise<T>
  }

  const probeAdjacentNavigation = async (date: string) => {
    const check = async (direction: 'prev' | 'next') => {
      try {
        const params = new URLSearchParams({ date, direction })
        await request<AdjacentDateResponse>(`/adjacent?${params.toString()}`)
        return true
      } catch {
        return false
      }
    }
    const [hasPrev, hasNext] = await Promise.all([check('prev'), check('next')])
    return { hasPrev, hasNext }
  }

  const deriveStatus = (payload: TPayload): BaseGameState<TChallenge, TGuess>['status'] => {
    if (payload.isGameOver) {
      return payload.outcome === 'won' ? 'won' : 'lost'
    }
    return 'playing'
  }

  const mapPayloadToState = (payload: TPayload): Partial<BaseGameState<TChallenge, TGuess>> => ({
    challenge: config.buildChallengeFromPayload(payload),
    guesses: payload.attempts.map(config.buildGuessFromAttempt),
    hintsRevealed: payload.hintsRevealed,
    status: deriveStatus(payload),
    isGameOver: payload.isGameOver,
    hasPrev: payload.hasPrevChallenge ?? false,
    hasNext: payload.hasNextChallenge ?? false,
  })

  let viewingDate: string | null = null

  return create<BaseGameState<TChallenge, TGuess> & BaseGameActions>()((set, get) => ({
    challenge: null,
    guesses: [],
    hintsRevealed: 0,
    status: 'idle',
    isLoading: false,
    isSubmitting: false,
    error: null,
    isGameOver: false,
    gameType: config.mediaType as 'film' | 'series' | 'wiki',
    viewingDate,
    hasPrev: false,
    hasNext: false,
    ui: {
      isModalOpen: false,
      modalType: null,
      inputValue: '',
      shakeTrigger: 0,
    },

    setGameType: (type) => set({ gameType: type }),

    initGame: async () => {
      viewingDate = null
      set({ isLoading: true, error: null, hasPrev: false, hasNext: false })
      try {
        const payload = await request<TPayload>('/today')
        viewingDate = null
        set({
          ...mapPayloadToState(payload),
          isLoading: false,
          isSubmitting: false,
          viewingDate,
        })
      } catch (err) {
        const statusCode = (err as Error & { status?: number }).status
        if (statusCode === 404) {
          const todayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
          const nav = await probeAdjacentNavigation(todayParis)
          set({
            error: toUserErrorMessage(err, 'Impossible de charger le défi.', { context: 'game' }),
            isLoading: false,
            isSubmitting: false,
            status: 'not_found',
            hasPrev: nav.hasPrev,
            hasNext: nav.hasNext,
          })
        } else {
          set({
            error: toUserErrorMessage(err, 'Impossible de charger le défi.', { context: 'game' }),
            isLoading: false,
            isSubmitting: false,
          })
        }
      }
    },

    loadDate: async (date: string) => {
      viewingDate = date
      set({
        isLoading: true,
        isSubmitting: false,
        error: null,
        hasPrev: false,
        hasNext: false,
      })
      try {
        const payload = await request<TPayload>(`/date/${encodeURIComponent(date)}`)
        set({
          ...mapPayloadToState(payload),
          isLoading: false,
          viewingDate,
        })
      } catch (err) {
        const statusCode = (err as Error & { status?: number }).status
        if (statusCode === 404) {
          const nav = await probeAdjacentNavigation(viewingDate)
          set({
            error: toUserErrorMessage(err, 'Impossible de charger le défi.', { context: 'game' }),
            isLoading: false,
            status: 'not_found',
            hasPrev: nav.hasPrev,
            hasNext: nav.hasNext,
          })
        } else {
          set({
            error: toUserErrorMessage(err, 'Impossible de charger le défi.', { context: 'game' }),
            isLoading: false,
            status: get().status,
            hasPrev: false,
            hasNext: false,
          })
        }
      }
    },

    navigateDate: async (direction: 'prev' | 'next') => {
      const currentDate = viewingDate ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
      set({ isLoading: true, error: null })
      try {
        const params = new URLSearchParams({ date: currentDate, direction })
        const { date } = await request<AdjacentDateResponse>(`/adjacent?${params.toString()}`)
        await get().loadDate(date)
      } catch (err) {
        set({
          error: toUserErrorMessage(err, 'Impossible de changer de date.', { context: 'game' }),
          isLoading: false,
        })
      }
    },

    submitGuess: async (guess: string) => {
      const current = get().challenge
      if (!current || get().isSubmitting || get().isGameOver) return

      set({ isSubmitting: true, error: null })
      try {
        const challengeId = (current as { challengeId?: number; id?: number }).challengeId
          ?? (current as { challengeId?: number; id?: number }).id
        const payload = await request<BaseGuessResponse<TPayload>>('/guess', {
          method: 'POST',
          body: JSON.stringify({ challengeId, guess }),
        })

        const newState = mapPayloadToState(payload.challenge)
        set({
          ...newState,
          isSubmitting: false,
          ...(payload.correct === false && { ui: { ...get().ui, shakeTrigger: get().ui.shakeTrigger + 1 } }),
        })

        if (payload.challenge.isGameOver && viewingDate === null) {
          const outcome = payload.challenge.outcome === 'won' ? 'won' : 'lost'
          const challengeDate = payload.challenge.date
          const type = get().gameType
          addToHistory(challengeDate, outcome, type)
          const prev = loadStats(type)
          const mappedGuesses = payload.challenge.attempts.map((a) => ({
            status: a.correct ? 'correct' as const : a.guess === '' ? 'skipped' as const : 'wrong' as const,
          }))
          const updated = updateStats(prev, { guesses: mappedGuesses, status: outcome }, challengeDate)
          saveStats(updated, type)
          // Persiste l'état complet pour que la carte « Ma journée » (loadGameState) retrouve
          // les guesses des autres jeux joués aujourd'hui.
          saveGameState({
            challengeId: challengeDate,
            guesses: payload.challenge.attempts.map((a) => ({
              value: a.guess,
              status: a.correct ? 'correct' as const : a.guess === '' ? 'skipped' as const : 'wrong' as const,
              timestamp: Date.now(),
            })),
            hintsUnlocked: get().hintsRevealed,
            status: outcome,
            blurIndex: 0,
            completedAt: Date.now(),
          }, type)
          if (useAuthStore.getState().user) {
            void authChallengeResult(
              payload.challenge.challengeId,
              outcome === 'won',
              payload.challenge.attempts.length,
            )
            void useAuthStore.getState().refreshServerStats()
          }
        }
      } catch (err) {
        set({
          error: toUserErrorMessage(err, 'Impossible d\'envoyer la réponse.', { context: 'game' }),
          isSubmitting: false,
        })
      }
    },

    skipAttempt: async () => {
      await get().submitGuess('')
    },

    revealHint: () => {
      const { hintsRevealed, challenge } = get()
      if (!challenge) return
      const maxHints = challenge.hintsAvailable ?? 3
      if (hintsRevealed < maxHints) {
        set({ hintsRevealed: hintsRevealed + 1 })
      }
    },

    resetError: () => set({ error: null }),
    openModal: (type) => set((state) => ({
      ui: {
        ...state.ui,
        isModalOpen: !!type,
        modalType: type,
      }
    })),
    closeModal: () => set((state) => ({
      ui: {
        ...state.ui,
        isModalOpen: false,
        modalType: null,
      }
    })),
    setInputValue: (value) => set((state) => ({
      ui: {
        ...state.ui,
        inputValue: value,
      }
    })),
  }))
}
