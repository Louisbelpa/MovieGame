import { useRef, useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SkipForward, Loader2 } from 'lucide-react'
import { useWikiStore } from '@/store/wikiStore'
import { useAutocomplete } from '@/hooks/useAutocomplete'
import { searchWikiPersons, type WikiPersonSuggestion } from '@/api/wikiClient'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface WikiGuessInputProps {
  onSubmit: (guess: string) => void
  onSkip: () => void
  disabled?: boolean
  attemptsLeft: number
}

export function WikiGuessInput({ onSubmit, onSkip, disabled, attemptsLeft }: WikiGuessInputProps) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputValue = useWikiStore((s) => s.ui.inputValue)
  const setInputValue = useWikiStore((s) => s.setInputValue)
  const shakeTrigger = useWikiStore((s) => s.ui.shakeTrigger)

  const { suggestions, isLoading } = useAutocomplete<WikiPersonSuggestion>(inputValue, searchWikiPersons, { debounceMs: 200 })
  const isOpen = suggestions.length > 0 && inputValue.length >= 2

  const handleSelect = (title: string) => {
    setInputValue('')
    setActiveIndex(-1)
    onSubmit(title)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'Enter' && inputValue.trim()) handleSelect(inputValue.trim())
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); break
      case 'ArrowUp': e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0) handleSelect(suggestions[activeIndex].title)
        else if (inputValue.trim()) handleSelect(inputValue.trim())
        break
      case 'Escape': setInputValue(''); setActiveIndex(-1); break
    }
  }

  return (
    <div className="relative w-full">
      <motion.div
        key={shakeTrigger}
        className={cn(
          'grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-2 p-2 sm:p-1 sm:pl-3 rounded-xl film-border transition-all min-h-[52px]',
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
          aria-activedescendant={activeIndex >= 0 ? `wiki-option-${activeIndex}` : undefined}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setActiveIndex(-1) }}
          onKeyDown={handleKeyDown}
          placeholder="Entrez un nom…"
          disabled={disabled}
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
          className="w-full bg-transparent text-film-text placeholder:text-film-text-dim text-sm outline-none min-w-0 py-2 text-base sm:text-sm"
        />
        {isLoading && <Loader2 size={14} className="text-film-text-dim animate-spin shrink-0" />}
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={disabled}
            title="Passer cette tentative" className="shrink-0 text-film-text-dim min-h-[44px] min-w-[44px] gap-1">
            <SkipForward size={14} />
            <span className="text-sm">Passer</span>
          </Button>
          <Button variant="primary" size="sm"
            onClick={() => inputValue.trim() && handleSelect(inputValue.trim())}
            disabled={disabled || !inputValue.trim()}
            className="shrink-0 min-h-[44px] px-4">
            Deviner
          </Button>
        </div>
      </motion.div>

      <p className="mt-1.5 text-sm text-film-text-dim text-right">
        {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} restante{attemptsLeft > 1 ? 's' : ''}
      </p>

      <AnimatePresence>
        {isOpen && (
          <motion.ul id={listboxId} role="listbox" aria-label="Suggestions de personnalités"
            className="absolute z-20 top-full mt-1 w-full film-border rounded-xl overflow-hidden shadow-2xl max-h-44 sm:max-h-60 overflow-y-auto"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}>
            {suggestions.map((s, i) => (
              <li key={`${s.title}-${i}`} id={`wiki-option-${i}`} role="option" aria-selected={i === activeIndex}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm transition-colors',
                  i === activeIndex ? 'bg-film-gold/15 text-film-gold' : 'text-film-text hover:bg-film-gray'
                )}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s.title) }}
                onMouseEnter={() => setActiveIndex(i)}>
                <span className="truncate">{s.title}</span>
                <span className="ml-3 text-film-text-dim shrink-0 text-sm capitalize">{s.year}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
