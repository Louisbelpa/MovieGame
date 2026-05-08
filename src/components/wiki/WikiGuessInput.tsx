import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, SkipForward } from 'lucide-react'
import { useWikiStore } from '@/store/wikiStore'
import { Button } from '@/components/ui/Button'
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
    }
  }

  return (
    <div className="relative w-full">
      <motion.div
        key={shakeTrigger}
        className={cn(
          'flex items-center gap-2 p-1 pl-3 rounded-xl film-border transition-all min-h-[52px]',
          disabled && 'opacity-50'
        )}
        animate={shakeTrigger > 0 ? { x: [-8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.35 }}
      >
        <Search size={16} className="text-film-text-dim shrink-0" aria-hidden />

        <input
          ref={inputRef}
          type="text"
          aria-label="Votre réponse, nom de personnalité"
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nom de la personnalité…"
          disabled={disabled}
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
          className={cn(
            'flex-1 bg-transparent text-film-text placeholder:text-film-text-dim',
            'text-sm outline-none min-w-0 py-2 rounded',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold',
            'sm:text-sm text-base'
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
