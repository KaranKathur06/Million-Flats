'use client'

import { useEffect, useState } from 'react'

/**
 * BlogStats — inline component for blog / SEO pages.
 * Shows: "X,XXX people read this guide this month" + "Readers from Y countries"
 *
 * Uses the summary API (countries) + blog views from the blog's own data.
 */
export default function BlogStats({ views }: { views?: number }) {
  const [countries, setCountries] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchCountries = async () => {
      try {
        const res = await fetch('/api/analytics/summary')
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled && json.countries) setCountries(json.countries)
      } catch { /* ignore */ }
    }
    void fetchCountries()
    return () => { cancelled = true }
  }, [])

  if (!views && !countries) return null

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 py-1">
      {views != null && views > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
          <span className="font-semibold text-gray-700 tabular-nums">{views.toLocaleString('en-US')}</span>
          {' '}people read this guide this month
        </span>
      )}
      {countries > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Readers from <span className="font-semibold text-gray-700 tabular-nums">{countries}+</span> countries
        </span>
      )}
    </div>
  )
}
