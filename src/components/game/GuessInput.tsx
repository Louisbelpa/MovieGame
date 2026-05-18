import { useId, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { cn } from '@/lib/utils'

interface GuessInputProps {
  onSubmit: (guess: string) => void
  onSkip: () => void
  disabled?: boolean
  attemptsLeft: number
}

export function GuessInput({ onSubmit, onSkip, disabled, attemptsLeft }: GuessInputProps) {
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const inputValue = useGameStore((s) => s.ui.inputValue)
  const setInputValue = useGameStore((s) => s.setInputValue)
  const shakeTrigger = useGameStore((s) => s.ui.shakeTrigger)
  const gameType = useGameStore((s) => s.gameType)

  const hasError = shakeTrigger > 0

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setInputValue('')
      onSubmit(inputValue.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onSkip()
    }
  }

  return (
    <div className="relative w-full">
      <motion.div
        key={shakeTrigger}
        className={cn('rounded-xl transition-all', disabled && 'opacity-50')}
        style={{
          padding: '5px 5px 5px 14px',
          border: '1px solid var(--mode-ring)',
          background: 'var(--color-film-surface)',
          boxShadow: '0 0 0 3px var(--mode-soft)',
        }}
        animate={shakeTrigger > 0 ? { x: [-8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-2">
          <Search size={15} className="text-film-text-dim shrink-0" aria-hidden />

          <input
            ref={inputRef}
            type="text"
            aria-label={gameType === 'series' ? 'Votre réponse, titre de la série' : 'Votre réponse, titre du film'}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={gameType === 'series' ? 'Titre de la série…' : 'Titre du film…'}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'flex-1 bg-transparent text-film-text placeholder:text-film-text-dim',
              'text-base sm:text-sm outline-none min-w-0 py-2 rounded leading-snug',
            )}
          />

          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="shrink-0 text-[12.5px] font-medium text-film-text-dim hover:text-film-text transition-colors px-2 py-1 rounded disabled:opacity-40 cursor-pointer"
          >
            Passer
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !inputValue.trim()}
            className="shrink-0 rounded-lg text-[12.5px] font-bold transition-opacity disabled:opacity-40 cursor-pointer"
            style={{
              background: 'linear-gradient(180deg, #e8c06a, #d4a64a, #a07030)',
              color: '#1a0f00',
              padding: '8px 14px',
            }}
          >
            Deviner
          </button>
        </div>
      </motion.div>

      <p id={errorId} className="sr-only" role={hasError ? 'alert' : undefined}>
        {hasError ? 'Réponse invalide, veuillez réessayer.' : ''}
      </p>
      <p className="sr-only" aria-live="polite">
        {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} restante{attemptsLeft > 1 ? 's' : ''}
      </p>
    </div>
  )
}
