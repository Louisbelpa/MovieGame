import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, SkipForward } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface GuessInputProps {
  onSubmit: (guess: string) => void
  onSkip: () => void
  disabled?: boolean
  attemptsLeft: number
}

export function GuessInput({ onSubmit, onSkip, disabled, attemptsLeft }: GuessInputProps) {
  const errorId = `guess-error-${Math.random().toString(36).slice(2)}`
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
    }
  }

  return (
    <div className="relative w-full">
      <motion.div
        key={shakeTrigger}
        className={cn(
          'flex items-center gap-1.5 sm:gap-2 p-1 pl-2 sm:pl-3 rounded-xl film-border transition-all min-h-[48px] sm:min-h-[52px]',
          disabled && 'opacity-50'
        )}
        animate={shakeTrigger > 0 ? { x: [-8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.35 }}
      >
        <Search size={16} className="text-film-text-dim shrink-0" aria-hidden />

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
            /* ≥16px sur mobile : évite le zoom automatique Safari iOS au focus */
            'text-base sm:text-sm outline-none min-w-0 py-1.5 sm:py-2 rounded leading-snug',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold',
          )}
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={disabled}
          title="Passer cette tentative"
          className="shrink-0 text-film-text-dim min-h-[44px] min-w-[44px] gap-1"
        >
          <SkipForward size={14} />
          <span className="text-sm">Passer</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={disabled || !inputValue.trim()}
          className="shrink-0 min-h-[44px] px-4"
        >
          Deviner
        </Button>
      </motion.div>

      <p id={errorId} className="sr-only" role={hasError ? 'alert' : undefined}>
        {hasError ? 'Réponse invalide, veuillez réessayer.' : ''}
      </p>

      <p className="mt-1.5 text-sm text-film-text-dim text-right">
        {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} restante{attemptsLeft > 1 ? 's' : ''}
      </p>
    </div>
  )
}
