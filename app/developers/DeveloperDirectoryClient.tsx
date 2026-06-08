'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type SortOption = 'featured' | 'most_projects' | 'newest' | 'oldest' | 'alphabetical'

interface DeveloperItem {
  id: string
  name: string
  slug: string | null
  logo: string | null
  banner: string | null
  countryCode: string
  city: string | null
  shortDescription: string | null
  website: string | null
  foundedYear: number | null
  isFeatured: boolean
  featuredRank: number | null
  customerRating: number | null
  projectsDelivered: number | null
  countriesPresent: number | null
  verixScore: number | null
  _count: { projects: number; properties: number }
}

const FALLBACK_IMAGE = '/images/default-property.jpg'

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'most_projects', label: 'Most Projects' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'alphabetical', label: 'A–Z' },
]

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.3
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < full ? 'text-amber-400' : i === full && hasHalf ? 'text-amber-300' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-600">{rating.toFixed(1)}</span>
    </span>
  )
}

function DeveloperCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 bg-gray-50 rounded-lg" />
          <div className="h-10 bg-gray-50 rounded-lg" />
          <div className="h-10 bg-gray-50 rounded-lg" />
        </div>
        <div className="h-11 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}

export default function DeveloperDirectoryClient() {
  const [developers, setDevelopers] = useState<DeveloperItem[]>([])
  const [loading, setLoading] = useState(true)
  const [country, setCountry] = useState('')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [sort, setSort] = useState<SortOption>('featured')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (country) params.set('country', country)
      if (searchDebounced) params.set('search', searchDebounced)
      if (sort) params.set('sort', sort)

      const res = await fetch(`/api/developers?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setDevelopers(json.data)
      }
    } catch (err) {
      console.error('Developer directory fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [country, searchDebounced, sort])

  useEffect(() => {
    load()
  }, [load])

  const indiaDevelopers = useMemo(
    () => developers.filter((d) => d.countryCode === 'INDIA' && d.isFeatured),
    [developers]
  )
  const uaeDevelopers = useMemo(
    () => developers.filter((d) => d.countryCode === 'UAE' && d.isFeatured),
    [developers]
  )

  const showFeaturedSections = !searchDebounced && !country && sort === 'featured'

  return (
    <div id="developer-grid" className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* ═══════ FEATURED SECTIONS ═══════ */}
      {showFeaturedSections && (indiaDevelopers.length > 0 || uaeDevelopers.length > 0) && (
        <div className="mb-14 space-y-14">
          {/* India Featured */}
          {indiaDevelopers.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🇮🇳</span>
                <div>
                  <h2 className="text-xl font-bold text-dark-blue sm:text-2xl">Featured India Developers</h2>
                  <p className="text-sm text-gray-500">Trusted builders across India's premium real estate markets</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {indiaDevelopers.map((dev) => (
                  <DeveloperCard key={dev.id} developer={dev} />
                ))}
              </div>
            </div>
          )}

          {/* UAE Featured */}
          {uaeDevelopers.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🇦🇪</span>
                <div>
                  <h2 className="text-xl font-bold text-dark-blue sm:text-2xl">Featured UAE Developers</h2>
                  <p className="text-sm text-gray-500">Dubai & Abu Dhabi's most prestigious real estate developers</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {uaeDevelopers.map((dev) => (
                  <DeveloperCard key={dev.id} developer={dev} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ ALL DEVELOPERS HEADER ═══════ */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-dark-blue sm:text-2xl">
          {showFeaturedSections ? 'All Developers' : `Developers${country ? ` — ${country}` : ''}`}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading...' : `${developers.length} developer${developers.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {/* ═══════ FILTER BAR ═══════ */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search + Country */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search developer..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:w-64"
            />
          </div>

          {/* Country Filter */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
            {[
              { value: '', label: 'All' },
              { value: 'UAE', label: '🇦🇪 UAE' },
              { value: 'INDIA', label: '🇮🇳 India' },
            ].map((opt) => (
              <button
                key={opt.value || 'all'}
                type="button"
                onClick={() => setCountry(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  country === opt.value
                    ? 'bg-dark-blue text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                sort === opt.key
                  ? 'bg-dark-blue text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ DEVELOPER GRID ═══════ */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <DeveloperCardSkeleton key={i} />
          ))}
        </div>
      ) : developers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
          <svg className="h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No developers found matching your filters.</p>
          <button
            type="button"
            onClick={() => { setSearch(''); setCountry(''); setSort('featured') }}
            className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {developers.map((dev) => (
            <DeveloperCard key={dev.id} developer={dev} />
          ))}
        </div>
      )}
    </div>
  )
}

function DeveloperCard({ developer: d }: { developer: DeveloperItem }) {
  const currentYear = new Date().getFullYear()
  const experience = d.foundedYear ? currentYear - d.foundedYear : null

  return (
    <Link
      href={d.slug ? `/developers/${d.slug}` : '#'}
      className={`group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:border-gray-200 transition-all duration-300 hover:-translate-y-1 ${
        !d.slug ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      {/* Featured accent */}
      {d.isFeatured && (
        <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 z-10" />
      )}

      {/* Banner */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        <Image
          src={d.banner || d.logo || FALLBACK_IMAGE}
          alt={d.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

        {/* Logo + badge overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white shadow-lg border border-white/30">
            {d.logo ? (
              <Image src={d.logo} alt="" fill className="object-contain p-1" sizes="40px" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-bold text-dark-blue">
                {d.name.charAt(0)}
              </div>
            )}
          </div>
          {d.isFeatured && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm backdrop-blur-sm">
              ★ Featured
            </span>
          )}
        </div>

        {/* Country badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-700 backdrop-blur-sm shadow-sm">
            {d.countryCode === 'UAE' ? '🇦🇪 UAE' : '🇮🇳 India'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-[1.05rem] font-bold text-dark-blue leading-snug line-clamp-1">{d.name}</h3>

        {d.city && (
          <p className="mt-1 text-xs text-gray-400 font-medium">
            {d.city}{d.countryCode ? `, ${d.countryCode === 'UAE' ? 'UAE' : 'India'}` : ''}
          </p>
        )}

        {d.shortDescription && (
          <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {d.shortDescription}
          </p>
        )}

        {/* Rating */}
        {d.customerRating && d.customerRating > 0 && (
          <div className="mt-2.5">
            <StarRating rating={d.customerRating} />
          </div>
        )}

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-dark-blue">{d._count.projects}</p>
            <p className="text-[10px] text-gray-400 font-medium">Projects</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-dark-blue">{d._count.properties}</p>
            <p className="text-[10px] text-gray-400 font-medium">Properties</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-dark-blue">{experience ? `${experience}y` : d.foundedYear || '—'}</p>
            <p className="text-[10px] text-gray-400 font-medium">{experience ? 'Experience' : 'Est.'}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-4">
          <span className="flex items-center justify-center h-11 rounded-xl bg-dark-blue text-white text-sm font-semibold shadow-sm group-hover:bg-[#0b1838] group-hover:shadow-md transition-all duration-300">
            View Profile
            <svg className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
