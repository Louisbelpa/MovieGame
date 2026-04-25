/**
 * hooks/useKeyboard.ts
 * Global keyboard handler: Escape closes modals/dropdown, Enter submits.
 */

import { useEffect } from 'react'

interface KeyboardHandlers {
  onEscape?: () => void
  onEnter?: () => void
}

export function useKeyboard({ onEscape, onEnter }: KeyboardHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape?.()
      if (e.key === 'Enter') onEnter?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEscape, onEnter])
}
