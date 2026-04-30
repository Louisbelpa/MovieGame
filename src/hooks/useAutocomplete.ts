import { useEffect, useRef, useState } from 'react'
import type { SearchResultPayload } from '@/api/client'

interface UseAutocompleteOptions {
  debounceMs?: number
  minLength?: number
  limit?: number
}

interface UseAutocompleteReturn {
  suggestions: SearchResultPayload[]
  isLoading: boolean
  error: string | null
  clear: () => void
}

export function useAutocomplete(
  query: string,
  searchFn: (q: string, limit?: number) => Promise<SearchResultPayload[]>,
  options: UseAutocompleteOptions = {}
): UseAutocompleteReturn {
  const { debounceMs = 220, minLength = 2, limit = 8 } = options

  const [suggestions, setSuggestions] = useState<SearchResultPayload[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()

    if (query.length < minLength) {
      setSuggestions([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const results = await searchFn(query, limit)
        if (!controller.signal.aborted) setSuggestions(results)
      } catch {
        if (!controller.signal.aborted) {
          setError('Recherche indisponible')
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [query, minLength, limit, debounceMs, searchFn])

  return { suggestions, isLoading, error, clear: () => { setSuggestions([]); setError(null); setIsLoading(false) } }
}
