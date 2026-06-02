import { create } from 'zustand'

const LS_KEY = 'gt_new_design'

function readFromStorage(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === 'true'
  } catch {
    return false
  }
}

interface UiPrefsState {
  newDesign: boolean
  toggleNewDesign: () => void
  setNewDesign: (value: boolean) => void
}

export const useUiPrefsStore = create<UiPrefsState>((set) => ({
  newDesign: readFromStorage(),
  toggleNewDesign: () =>
    set((s) => {
      const next = !s.newDesign
      try { localStorage.setItem(LS_KEY, String(next)) } catch { /* noop */ }
      return { newDesign: next }
    }),
  setNewDesign: (value: boolean) => {
    try { localStorage.setItem(LS_KEY, String(value)) } catch { /* noop */ }
    set({ newDesign: value })
  },
}))
