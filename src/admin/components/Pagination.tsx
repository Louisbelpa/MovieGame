/**
 * admin/components/Pagination.tsx
 * Reusable pagination bar for server-side paginated tables.
 */

interface PaginationProps {
  page: number
  pages: number
  total: number
  limit: number
  onPage: (p: number) => void
}

export function Pagination({ page, pages, total, limit, onPage }: PaginationProps) {
  if (pages <= 1) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  // Build page number array with ellipsis markers (-1)
  function buildPageNumbers(): number[] {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const nums: number[] = []
    const delta = 2
    const left = page - delta
    const right = page + delta

    let lastPushed = 0
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= left && i <= right)) {
        if (lastPushed && i - lastPushed > 1) nums.push(-1) // ellipsis
        nums.push(i)
        lastPushed = i
      }
    }
    return nums
  }

  const pageNumbers = buildPageNumbers()

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3">
      <p className="text-xs text-gray-500">
        {from}–{to} sur {total} résultat{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Précédent
        </button>

        {pageNumbers.map((n, i) =>
          n === -1 ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-gray-400 select-none">…</span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                n === page
                  ? 'border-indigo-600 bg-indigo-600 text-white font-semibold'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
