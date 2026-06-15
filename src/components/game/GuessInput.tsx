import { useId, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'

interface GuessInputProps {
  onSubmit: (guess: string) => void
  onSkip: () => void
  disabled?: boolean
  attemptsLeft: number
}

export function GuessInput({ onSubmit, onSkip, disabled, attemptsLeft }: GuessInputProps) {
  const errorId   = useId()
  const inputRef  = useRef<HTMLInputElement>(null)
  const inputValue    = useGameStore((s) => s.ui.inputValue)
  const setInputValue = useGameStore((s) => s.setInputValue)
  const shakeTrigger  = useGameStore((s) => s.ui.shakeTrigger)
  const gameType      = useGameStore((s) => s.gameType)
  const hasError = shakeTrigger > 0

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setInputValue('')
      onSubmit(inputValue.trim())
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) handleSubmit()
    else if (e.key === 'Escape') onSkip()
  }

  return (
    <div className="relative w-full">
      <motion.div
        key={shakeTrigger}
        className={`cdym-ar-input${disabled ? ' opacity-50' : ''}`}
        animate={shakeTrigger > 0 ? { x: [-8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.35 }}
      >
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
          style={{
            flex: 1, background: 'transparent', color: 'var(--ink)',
            fontSize: 16, outline: 'none', minWidth: 0,
            fontFamily: 'Fredoka, sans-serif', fontWeight: 500,
          }}
        />
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', padding: '8px 10px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Fredoka, sans-serif' }}
        >
          Passer
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !inputValue.trim()}
          className="cdy-btn cdy-btn-primary"
          style={{ padding: '10px 16px', fontSize: 14, flexShrink: 0, opacity: !inputValue.trim() ? 0.4 : 1 }}
        >
          Valider ↵
        </button>
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
