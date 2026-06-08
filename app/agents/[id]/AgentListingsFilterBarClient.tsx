'use client'

import Link from 'next/link'
import { useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import FormSelect from '@/components/FormSelect'

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: any
  return (...args: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

type Props = {
  pathname: string
  baseQuery: Record<string, string>
  limit: number
  source: 'all' | 'manual'
  minPrice: number | null
  maxPrice: number | null
  beds: number
  typeFilter: string
  cityFilter: string
  communityFilter: string
  sort: 'newest' | 'price_asc' | 'price_desc'
  showingCount: number
  totalCount: number
}

const KNOWN_KEYS = new Set([
  'page',
  'limit',
  'source',
  'minPrice',
  'maxPrice',
  'beds',
  'type',
  'city',
  'community',
  'sort',
])

function buildHref(pathname: string, query: Record<string, string>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    const vv = (v || '').trim()
    if (!vv) continue
    sp.set(k, vv)
  }
  const s = sp.toString()
  return `${pathname}${s ? `?${s}` : ''}`
}

export default function AgentListingsFilterBarClient({
  pathname,
  baseQuery,
  limit,
  source,
  minPrice,
  maxPrice,
  beds,
  typeFilter,
  cityFilter,
  communityFilter,
  sort,
  showingCount,
  totalCount,
}: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)

  const clearHref = useMemo(() => {
    const next: Record<string, string> = { ...baseQuery }
    for (const k of ['minPrice', 'maxPrice', 'beds', 'type', 'city', 'community', 'sort'] as const) {
      delete next[k]
    }
    next.page = '1'
    next.limit = String(limit)
    if (source === 'all') delete next.source
    else next.source = source
    return buildHref(pathname, next)
  }, [baseQuery, limit, pathname, source])

  const submitFromForm = useCallback(() => {
    const form = formRef.current
    if (!form) return

    const fd = new FormData(form)
    const next: Record<string, string> = {}

    for (const [k, v] of Object.entries(baseQuery)) {
      if (!KNOWN_KEYS.has(k)) next[k] = v
    }

    for (const [k, v] of fd.entries()) {
      if (typeof v !== 'string') continue
      const vv = v.trim()
      if (!vv) continue
      next[k] = vv
    }

    next.page = '1'
    next.limit = String(limit)
    if (source === 'all') delete next.source
    else next.source = source

    const href = buildHref(pathname, next)
    router.push(href)
  }, [baseQuery, limit, pathname, router, source])

  const debouncedSubmit = useMemo(() => debounce(submitFromForm, 450), [submitFromForm])

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <form ref={formRef} method="get" action={pathname} className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {source !== 'all' ? <input type="hidden" name="source" value={source} /> : null}
        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="limit" value={String(limit)} />

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Min price</label>
          <input
            name="minPrice"
            type="number"
            min={0}
            defaultValue={minPrice ? String(minPrice) : ''}
            onChange={() => debouncedSubmit()}
            className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Max price</label>
          <input
            name="maxPrice"
            type="number"
            min={0}
            defaultValue={maxPrice ? String(maxPrice) : ''}
            onChange={() => debouncedSubmit()}
            className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white"
            placeholder="Any"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Beds</label>
          <FormSelect
            name="beds"
            defaultValue={beds ? String(beds) : ''}
            onValueChange={submitFromForm}
            options={[
              { value: '', label: 'Any' },
              { value: '1', label: '1+' },
              { value: '2', label: '2+' },
              { value: '3', label: '3+' },
              { value: '4', label: '4+' },
              { value: '5', label: '5+' },
              { value: '6', label: '6+' },
            ]}
            variant="light"
            dense
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Property type</label>
          <FormSelect
            name="type"
            defaultValue={typeFilter}
            onValueChange={submitFromForm}
            options={[
              { value: '', label: 'All' },
              { value: 'Apartment', label: 'Apartment' },
              { value: 'Villa', label: 'Villa' },
              { value: 'Plot', label: 'Plot' },
              { value: 'Commercial', label: 'Commercial' },
            ]}
            variant="light"
            dense
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
          <input
            name="city"
            type="text"
            defaultValue={cityFilter}
            onChange={() => debouncedSubmit()}
            className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white"
            placeholder="Dubai"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Community</label>
          <input
            name="community"
            type="text"
            defaultValue={communityFilter}
            onChange={() => debouncedSubmit()}
            className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white"
            placeholder="Marina"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Sort</label>
          <FormSelect
            name="sort"
            defaultValue={sort}
            onValueChange={submitFromForm}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'price_asc', label: 'Price: Low to High' },
              { value: 'price_desc', label: 'Price: High to Low' },
            ]}
            variant="light"
            dense
          />
        </div>

        <div className="md:col-span-2 flex items-end gap-3">
          <button
            type="submit"
            className="flex-1 h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
          >
            Apply
          </button>
          <Link
            href={clearHref}
            className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50 flex items-center justify-center"
          >
            Clear
          </Link>
        </div>
      </form>
      <p className="mt-3 text-xs text-gray-500">
        Showing {showingCount} of {totalCount} matching listings.
      </p>
    </div>
  )
}
