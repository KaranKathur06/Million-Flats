'use client'

import { useAnalyticsSummary } from './useAnalyticsSummary'

/**
 * DeveloperStats — B2B stats section for developer/partner pages.
 * Shows: Developers Onboarded, 3D Tours Completed, Buyers from X Countries
 */
export default function DeveloperStats() {
  const { data, loading } = useAnalyticsSummary()

  const stats = [
    {
      value: data.developers,
      suffix: '+',
      label: 'Developers Onboarded',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 9h3M15 15h3M6 9h.01M6 15h.01" />
        </svg>
      ),
    },
    {
      value: data.tours,
      suffix: '+',
      label: '3D Tours Completed',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      value: data.countries,
      suffix: '+',
      label: 'Buyer Countries',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
  ]

  return (
    <div
      className={[
        'grid grid-cols-1 sm:grid-cols-3 gap-6',
        loading ? 'animate-pulse' : '',
      ].join(' ')}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#0d1f38]/60 border border-white/[0.06] hover:bg-[#0d1f38]/80 transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/20 flex items-center justify-center text-amber-400 mb-4">
            {s.icon}
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums mb-1">
            {s.value.toLocaleString('en-US')}{s.suffix}
          </p>
          <p className="text-xs text-white/50 uppercase tracking-widest font-medium">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
