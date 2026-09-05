import Link from 'next/link'

interface ServerDirectoryPaginationProps {
  page: number
  totalPages: number
  query?: string
}

export default function ServerDirectoryPagination({ page, totalPages, query = '' }: ServerDirectoryPaginationProps) {
  if (totalPages <= 1) return null
  const pages: Array<number | 'ellipsis'> = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  if (start > 1) pages.push(1)
  if (start > 2) pages.push('ellipsis')
  for (let value = start; value <= end; value += 1) pages.push(value)
  if (end < totalPages - 1) pages.push('ellipsis')
  if (end < totalPages) pages.push(totalPages)
  const href = (value: number) => `/agents?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(value) }).toString()}`

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Agent directory pagination">
      {page > 1 ? <Link href={href(page - 1)} className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 inline-flex items-center text-sm font-semibold text-dark-blue">Previous</Link> : <span className="min-h-10 rounded-lg border border-gray-100 bg-gray-50 px-3 inline-flex items-center text-sm font-semibold text-gray-300">Previous</span>}
      {pages.map((value, index) => value === 'ellipsis' ? <span key={`ellipsis-${index}`} className="px-1 text-sm text-gray-400">...</span> : <Link key={value} href={href(value)} aria-current={value === page ? 'page' : undefined} className={`min-h-10 min-w-10 rounded-lg border px-3 inline-flex items-center justify-center text-sm font-semibold ${value === page ? 'border-dark-blue bg-dark-blue text-white' : 'border-gray-200 bg-white text-dark-blue'}`}>{value}</Link>)}
      {page < totalPages ? <Link href={href(page + 1)} className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 inline-flex items-center text-sm font-semibold text-dark-blue">Next</Link> : <span className="min-h-10 rounded-lg border border-gray-100 bg-gray-50 px-3 inline-flex items-center text-sm font-semibold text-gray-300">Next</span>}
    </nav>
  )
}
