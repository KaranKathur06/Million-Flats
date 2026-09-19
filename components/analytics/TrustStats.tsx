'use client'

import type { ReactNode } from 'react'
import { useAnalyticsSummary, type AnalyticsSummaryData } from './useAnalyticsSummary'

const compactValue = (value: number, suffix = '') => {
  if (value >= 1000) {
    const compact = Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
    return `${compact}${suffix}`
  }

  return `${value.toLocaleString('en-US')}${suffix}`
}

const accentStyles = {
  amber: {
    bg: 'bg-amber-400/10',
    iconBg: 'bg-amber-400/10',
    text: 'text-amber-300',
    border: 'border-amber-300/35',
    glow: 'shadow-[0_0_0_1px_rgba(251,191,36,0.2)]',
  },
  blue: {
    bg: 'bg-sky-400/10',
    iconBg: 'bg-sky-400/10',
    text: 'text-sky-300',
    border: 'border-sky-300/35',
    glow: 'shadow-[0_0_0_1px_rgba(96,165,250,0.2)]',
  },
  emerald: {
    bg: 'bg-emerald-400/10',
    iconBg: 'bg-emerald-400/10',
    text: 'text-emerald-300',
    border: 'border-emerald-300/35',
    glow: 'shadow-[0_0_0_1px_rgba(52,211,153,0.2)]',
  },
  rose: {
    bg: 'bg-rose-400/10',
    iconBg: 'bg-rose-400/10',
    text: 'text-rose-300',
    border: 'border-rose-300/35',
    glow: 'shadow-[0_0_0_1px_rgba(251,113,133,0.2)]',
  },
  violet: {
    bg: 'bg-violet-400/10',
    iconBg: 'bg-violet-400/10',
    text: 'text-violet-300',
    border: 'border-violet-300/35',
    glow: 'shadow-[0_0_0_1px_rgba(167,139,250,0.2)]',
  },
} as const

function StatCard({
  icon,
  value,
  suffix,
  label,
  accentColor = 'amber',
}: {
  icon: ReactNode
  value: number
  suffix?: string
  label: string
  accentColor?: keyof typeof accentStyles
}) {
  const accent = accentStyles[accentColor]

  return (
    <div className="group relative flex min-h-[168px] items-center justify-center overflow-hidden rounded-[26px] border border-white/15 bg-white/[0.04] p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.06]">
      <div className={`absolute inset-x-4 top-0 h-px bg-gradient-to-r ${accent.bg}`} />
      <div className="flex w-full items-center justify-center gap-4">
        <div className={[
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border',
          accent.iconBg,
          accent.border,
          accent.glow,
        ].join(' ')}>
          <span className={`${accent.text}`}>{icon}</span>
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="text-[2.1rem] font-black tracking-[-0.08em] leading-none text-white tabular-nums sm:text-[2.3rem]">
            {compactValue(value, suffix)}
          </div>
          <div className="mt-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[0.75rem]">
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}

const IconUsers = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconGlobe = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)
const IconBook = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)
const IconMapPin = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconBuilding = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" />
  </svg>
)
const IconCompass = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="m14.5 9.5-2.5 7-7-2.5 2.5-7 7 2.5z" />
  </svg>
)

type MetricAccent = keyof typeof accentStyles
type NumericAnalyticsKey = {
  [Key in keyof AnalyticsSummaryData]: AnalyticsSummaryData[Key] extends number ? Key : never
}[keyof AnalyticsSummaryData]

type TrustMetricDefinition = {
  id: string
  valueKey: NumericAnalyticsKey
  label: string
  icon: ReactNode
  accent: MetricAccent
}

const trustMetricDefinitions: readonly TrustMetricDefinition[] = [
  { id: 'monthly-visitors', valueKey: 'monthlyVisitors', label: 'Monthly Visitors', icon: <IconUsers />, accent: 'amber' },
  { id: 'cities-covered', valueKey: 'cities', label: 'Cities Covered', icon: <IconMapPin />, accent: 'blue' },
  { id: 'countries-reached', valueKey: 'countries', label: 'Countries Reached', icon: <IconGlobe />, accent: 'rose' },
  { id: 'buy-properties', valueKey: 'buyProperties', label: 'Buy Listings', icon: <IconCompass />, accent: 'emerald' },
  { id: 'rent-properties', valueKey: 'rentProperties', label: 'Rent Listings', icon: <IconBuilding />, accent: 'violet' },
  { id: 'total-projects', valueKey: 'totalProjects', label: 'Total Projects', icon: <IconBuilding />, accent: 'amber' },
  { id: 'ecosystem-partners', valueKey: 'ecosystemPartners', label: 'Ecosystem Partners', icon: <IconBook />, accent: 'emerald' },
  { id: 'developers', valueKey: 'developers', label: 'Developers', icon: <IconBuilding />, accent: 'violet' },
  { id: 'agents', valueKey: 'agents', label: 'Agents', icon: <IconUsers />, accent: 'amber' },
  { id: 'investment-insights', valueKey: 'blogs', label: 'Insights', icon: <IconBook />, accent: 'rose' },
]

export default function TrustStats() {
  const { data, loading } = useAnalyticsSummary()
  const metrics = trustMetricDefinitions
    .map((metric) => ({ ...metric, value: data[metric.valueKey] }))
    .filter((metric) => Number.isFinite(metric.value) && metric.value > 0)

  return (
    <section className="relative isolate overflow-hidden bg-[#071b2e] py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.12),transparent_26%),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.06),transparent_32%)]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-12">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-amber-300/90">
            Trusted Platform
          </p>
          <h2 className="text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl lg:text-[4.1rem]">
            Why MillionFlats
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base text-white/70 sm:text-xl">
            Real numbers. Real trust. Connecting global investors with premium properties.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Loading trust metrics">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="min-h-[168px] animate-pulse rounded-[26px] border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        ) : metrics.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {metrics.map((metric, index) => (
              <div key={metric.id} className="mf-animate-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
                <StatCard
                  icon={metric.icon}
                  value={metric.value}
                  suffix="+"
                  label={metric.label}
                  accentColor={metric.accent}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
