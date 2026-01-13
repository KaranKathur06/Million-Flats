'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Props = {
  total: number
  limit: number
}

type Token = number | 'ellipsis'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function buildTokens(currentPage: number, totalPages: number): Token[] {
  if (totalPages <= 1) return []
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)

  const tokens: Token[] = []
  const page = clamp(currentPage, 1, totalPages)

  // Strictly show up to 5 page numbers.
  // Always include first + last pages, with an ellipsis when gaps exist.
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

export default function Pagination({ total, limit }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const page = useMemo(() => {
    const raw = searchParams?.get('page') ?? ''
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
  }, [searchParams])

  const safePage = Math.min(Math.max(page, 1), totalPages)
  const tokens = useMemo(() => buildTokens(safePage, totalPages), [safePage, totalPages])

  if (totalPages <= 1) return null

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    next.set('page', String(nextPage))
    next.set('limit', String(limit))

    window.scrollTo({ top: 0, behavior: 'smooth' })
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <nav aria-label="Pagination" className="mt-10">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => goToPage(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="h-11 px-4 sm:px-5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          {'\u2190'} Prev
        </button>

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
            return (
              <button
                key={t}
                type="button"
                onClick={() => goToPage(t)}
                aria-current={active ? 'page' : undefined}
                className={`h-11 min-w-11 px-3 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-dark-blue/25 ${
                  active
                    ? 'border-dark-blue bg-dark-blue text-white'
                    : 'border-gray-200 bg-white text-dark-blue hover:bg-gray-50'
                }`}
              >
                {t}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          className="h-11 px-4 sm:px-5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          Next {'\u2192'}
        </button>
      </div>

      <div className="mt-3 text-center text-xs text-gray-500">
        Page {safePage} of {totalPages}
      </div>
    </nav>
  )
}
