import { useState, useCallback, useEffect, useRef } from 'react'

interface ListResult<T> {
  data: T[]
  total: number
  pages: number
  page: number
  limit: number
}

export function useList<T>(
  fetcher: (opts: { page: number; limit: number; q: string }) => Promise<ListResult<T>>,
  limit = 20,
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(
    (p: number, q: string) => {
      setLoading(true)
      setError(null)
      fetcher({ page: p, limit, q: q.trim() })
        .then((res) => {
          if (!mountedRef.current) return
          setItems(res.data)
          setPages(res.pages)
          setTotal(res.total)
        })
        .catch((err) => {
          if (!mountedRef.current) return
          setError(err instanceof Error ? err.message : 'Erreur')
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false)
        })
    },
    [fetcher, limit],
  )

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { load(page, search) }, [load, page, search])

  return {
    items,
    loading,
    error,
    page,
    pages,
    total,
    search,
    setSearch,
    setPage,
    reload: () => load(page, search),
    setItems,
  }
}
