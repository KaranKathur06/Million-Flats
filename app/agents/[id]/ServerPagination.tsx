import Link from 'next/link'

type Token = number | 'ellipsis'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function buildTokens(currentPage: number, totalPages: number): Token[] {
  if (totalPages <= 1) return []
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)

  const tokens: Token[] = []
  const page = clamp(currentPage, 1, totalPages)

  tokens.push(1)

  if (page <= 3) {
    tokens.push(2, 3, 4)
    tokens.push('ellipsis', totalPages)
    return tokens
  }

  if (page >= totalPages - 2) {
    tokens.push('ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    return tokens
  }

  tokens.push('ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages)
  return tokens
}

function buildHref(pathname: string, query: Record<string, string>, page: number, limit: number) {
  const sp = new URLSearchParams(query)
  sp.set('page', String(page))
  sp.set('limit', String(limit))
  const qs = sp.toString()
  return `${pathname}${qs ? `?${qs}` : ''}`
}

export default function ServerPagination({
  pathname,
  query,
  total,
  limit,
  page,
}: {
  pathname: string
  query: Record<string, string>
  total: number
  limit: number
  page: number
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = clamp(page, 1, totalPages)
  const tokens = buildTokens(safePage, totalPages)

  if (totalPages <= 1) return null

  const prevHref = buildHref(pathname, query, Math.max(1, safePage - 1), limit)
  const nextHref = buildHref(pathname, query, Math.min(totalPages, safePage + 1), limit)

  return (
    <nav aria-label="Pagination" className="mt-10">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <Link
          href={prevHref}
          aria-disabled={safePage <= 1}
          className={`h-11 px-4 sm:px-5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50 ${
            safePage <= 1 ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {'\u2190'} Prev
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {tokens.map((t, idx) => {
            if (t === 'ellipsis') {
              return (
                <span
                  key={`e-${idx}`}
                  className="h-11 px-2 sm:px-3 flex items-center justify-center text-sm text-gray-500 select-none"
                  aria-hidden="true"
                >
                  {'\u2026'}
                </span>
              )
            }

            const active = t === safePage
            const href = buildHref(pathname, query, t, limit)

            return (
              <Link
                key={t}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`h-11 min-w-11 px-3 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-dark-blue/25 ${
                  active
                    ? 'border-dark-blue bg-dark-blue text-white'
                    : 'border-gray-200 bg-white text-dark-blue hover:bg-gray-50'
                }`}
              >
                {t}
              </Link>
            )
          })}
        </div>

        <Link
          href={nextHref}
          aria-disabled={safePage >= totalPages}
          className={`h-11 px-4 sm:px-5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50 ${
            safePage >= totalPages ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          Next {'\u2192'}
        </Link>
      </div>

      <div className="mt-3 text-center text-xs text-gray-500">
        Page {safePage} of {totalPages}
      </div>
    </nav>
  )
}
