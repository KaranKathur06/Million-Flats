'use client'

import { useAnalyticsSummary } from './useAnalyticsSummary'

/**
 * FooterTrust — subtle trust line for the global footer.
 * "Trusted by X,XXX+ investors · Visitors from Y+ countries"
 */
export default function FooterTrust() {
  const { data, loading } = useAnalyticsSummary()

  if (loading) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-gray-500 text-xs sm:text-sm">
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/70">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Trusted by{' '}
        <span className="font-semibold text-gray-700 tabular-nums">
          {data.monthlyVisitors.toLocaleString('en-US')}+
        </span>{' '}
        investors
      </span>

      <span className="text-gray-300">·</span>

      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400/70">
          <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        Visitors from{' '}
        <span className="font-semibold text-gray-700 tabular-nums">
          {data.countries}+
        </span>{' '}
        countries
      </span>
    </div>
  )
}
