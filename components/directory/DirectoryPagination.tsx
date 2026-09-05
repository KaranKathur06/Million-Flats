'use client'

interface DirectoryPaginationProps {
  page: number
  totalPages: number
  loading?: boolean
  onPageChange: (page: number) => void
}

export default function DirectoryPagination({ page, totalPages, loading = false, onPageChange }: DirectoryPaginationProps) {
  if (totalPages <= 1) return null

  const pages: Array<number | 'ellipsis'> = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  if (start > 1) pages.push(1)
  if (start > 2) pages.push('ellipsis')
  for (let value = start; value <= end; value += 1) pages.push(value)
  if (end < totalPages - 1) pages.push('ellipsis')
  if (end < totalPages) pages.push(totalPages)

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Directory pagination">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1 || loading}
        className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-dark-blue transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      {pages.map((value, index) => value === 'ellipsis' ? (
        <span key={`ellipsis-${index}`} className="px-1 text-sm text-gray-400" aria-hidden="true">...</span>
      ) : (
        <button
          key={value}
          type="button"
          onClick={() => onPageChange(value)}
          disabled={value === page || loading}
          aria-current={value === page ? 'page' : undefined}
          className={`min-h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed ${value === page ? 'border-dark-blue bg-dark-blue text-white' : 'border-gray-200 bg-white text-dark-blue hover:bg-gray-50'}`}
        >
          {value}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages || loading}
        className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-dark-blue transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  )
}
