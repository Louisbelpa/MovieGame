import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useWikiStore } from '@/store/wikiStore'
import { cn } from '@/lib/utils'

interface WikiGuessInputProps {
  onSubmit: (guess: string) => void
  onSkip: () => void
  disabled?: boolean
  attemptsLeft: number
}

export function WikiGuessInput({ onSubmit, onSkip, disabled, attemptsLeft }: WikiGuessInputProps) {
  const errorId = 'wiki-guess-error'
  const inputRef = useRef<HTMLInputElement>(null)

  const inputValue = useWikiStore((s) => s.ui.inputValue)
  const setInputValue = useWikiStore((s) => s.setInputValue)
  const shakeTrigger = useWikiStore((s) => s.ui.shakeTrigger)

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
            aria-label="Votre réponse, nom de personnalité"
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Personnalité…"
            disabled={disabled}
            autoComplete="off"
            enterKeyHint="search"
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
              background: 'var(--color-film-surface)',
              color: 'var(--mode-color)',
              border: '1.5px solid var(--mode-color)',
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
