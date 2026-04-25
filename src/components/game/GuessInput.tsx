/**
 * game/GuessInput.tsx
 * Search-as-you-type input with autocomplete dropdown.
 * Keyboard-navigable list (ArrowUp/Down/Enter).
 */

import { useRef, useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SkipForward, Loader2 } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { useAutocomplete } from '@/hooks/useAutocomplete'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface GuessInputProps {
  onSubmit: (guess: string) => void
  onSkip: () => void
  disabled?: boolean
  attemptsLeft: number
}

export function GuessInput({ onSubmit, onSkip, disabled, attemptsLeft }: GuessInputProps) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputValue = useGameStore((s) => s.ui.inputValue)
  const setInputValue = useGameStore((s) => s.setInputValue)
  const shakeTrigger = useGameStore((s) => s.ui.shakeTrigger)

  const { suggestions, isLoading } = useAutocomplete(inputValue, { debounceMs: 200 })
  const isOpen = suggestions.length > 0 && inputValue.length >= 2

  const handleSelect = (title: string) => {
    setInputValue('')
    setActiveIndex(-1)
    onSubmit(title)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'Enter' && inputValue.trim()) {
        handleSelect(inputValue.trim())
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0) {
          handleSelect(suggestions[activeIndex].title)
        } else if (inputValue.trim()) {
          handleSelect(inputValue.trim())
        }
        break
      case 'Escape':
        setInputValue('')
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div className="relative w-full">
      {/* Input row */}
      <motion.div
        key={shakeTrigger}
        className={cn(
          'flex items-center gap-2 p-1 pl-3 rounded-xl film-border',
          'focus-within:border-film-gold/60 transition-colors',
          disabled && 'opacity-50'
        )}
        animate={shakeTrigger > 0 ? { x: [-8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.35 }}
      >
        <Search size={16} className="text-film-text-dim shrink-0" aria-hidden />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setActiveIndex(-1) }}
          onKeyDown={handleKeyDown}
          placeholder="Titre du film…"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'flex-1 bg-transparent text-film-text placeholder:text-film-text-dim',
            'text-sm outline-none min-w-0 py-2'
          )}
        />

        {isLoading && (
          <Loader2 size={14} className="text-film-text-dim animate-spin shrink-0" />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={disabled}
          title="Passer cette tentative"
          className="shrink-0 text-film-text-dim"
        >
          <SkipForward size={14} />
          <span className="hidden sm:inline">Passer</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => inputValue.trim() && handleSelect(inputValue.trim())}
          disabled={disabled || !inputValue.trim()}
          className="shrink-0"
        >
          Deviner
        </Button>
      </motion.div>

      {/* Attempts counter */}
      <p className="mt-1.5 text-xs text-film-text-dim text-right">
        {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} restante{attemptsLeft > 1 ? 's' : ''}
      </p>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            id={listboxId}
            role="listbox"
            aria-label="Suggestions de films"
            className={cn(
              'absolute z-20 top-full mt-1 w-full',
              'film-border rounded-xl overflow-hidden shadow-2xl',
              'max-h-60 overflow-y-auto'
            )}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {suggestions.map((s, i) => (
              <li
                key={`${s.title}-${s.year}`}
                id={`option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5 cursor-pointer',
                  'text-sm transition-colors',
                  i === activeIndex
                    ? 'bg-film-gold/15 text-film-gold'
                    : 'text-film-text hover:bg-film-gray'
                )}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s.title) }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="truncate">{s.title}</span>
                <span className="ml-3 text-film-text-dim shrink-0">{s.year}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
