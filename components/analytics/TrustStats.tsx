'use client'

import { useAnalyticsSummary } from './useAnalyticsSummary'

/* ── Animated counter ───────────────────────────────────── */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <span className="tabular-nums">
      {value.toLocaleString('en-US')}
      {suffix}
    </span>
  )
}

/* ── Stat card ──────────────────────────────────────────── */
function StatCard({
  icon,
  value,
  suffix,
  label,
  accentColor = 'amber',
}: {
  icon: React.ReactNode
  value: number
  suffix?: string
  label: string
  accentColor?: 'amber' | 'blue' | 'emerald' | 'rose'
}) {
  const colorMap = {
    amber: { ring: 'ring-amber-400/20', bg: 'bg-amber-400/10', text: 'text-amber-400', glow: 'shadow-amber-400/10' },
    blue: { ring: 'ring-blue-400/20', bg: 'bg-blue-400/10', text: 'text-blue-400', glow: 'shadow-blue-400/10' },
    emerald: { ring: 'ring-emerald-400/20', bg: 'bg-emerald-400/10', text: 'text-emerald-400', glow: 'shadow-emerald-400/10' },
    rose: { ring: 'ring-rose-400/20', bg: 'bg-rose-400/10', text: 'text-rose-400', glow: 'shadow-rose-400/10' },
  }
  const c = colorMap[accentColor]

  return (
    <div
      className={[
        'group relative flex flex-col items-center justify-center text-center',
        'rounded-2xl border border-white/[0.06] p-6 sm:p-8',
        'bg-white/[0.03] hover:bg-white/[0.06]',
        'transition-all duration-300 hover:scale-[1.02]',
        `hover:shadow-xl ${c.glow}`,
      ].join(' ')}
    >
      {/* Icon badge */}
      <div
        className={[
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
          `${c.bg} ring-1 ${c.ring}`,
          'group-hover:scale-110 transition-transform duration-300',
        ].join(' ')}
      >
        <span className={`${c.text}`}>{icon}</span>
      </div>

      {/* Number */}
      <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-none mb-1.5">
        <AnimatedNumber value={value} suffix={suffix} />
      </p>

      {/* Label */}
      <p className="text-xs sm:text-sm font-medium text-white/50 uppercase tracking-widest">
        {label}
      </p>
    </div>
  )
}

/* ── Icon SVGs ──────────────────────────────────────────── */
const IconUsers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconGlobe = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)
const IconBook = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)
const IconMapPin = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)

/* ── Main Component ─────────────────────────────────────── */
export default function TrustStats() {
  const { data, loading } = useAnalyticsSummary()
  const safeCities = data.cities > 0 ? data.cities : 40

  return (
    <section
      className="relative w-full overflow-hidden -mt-[1px] bg-[#0d1f38]"
      style={{
        background: 'linear-gradient(135deg, #0d1f38 0%, #152d4f 50%, #0d1f38 100%)',
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-amber-400 font-semibold text-xs uppercase tracking-[0.2em] mb-3">
            Trusted Platform
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-4 tracking-tight">
            Why MillionFlats
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Real numbers. Real trust. Connecting global investors with premium properties.
          </p>
        </div>

        {/* Stats grid */}
        <div
          className={[
            'grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto',
            loading ? 'animate-pulse' : '',
          ].join(' ')}
        >
          <StatCard
            icon={<IconUsers />}
            value={data.monthlyVisitors}
            suffix="+"
            label="Monthly Visitors"
            accentColor="amber"
          />
          <StatCard
            icon={<IconMapPin />}
            value={safeCities}
            suffix="+"
            label="Cities Covered"
            accentColor="blue"
          />
          <StatCard
            icon={<IconBook />}
            value={data.blogs}
            label="Investment Insights"
            accentColor="emerald"
          />
          <StatCard
            icon={<IconGlobe />}
            value={data.countries}
            suffix="+"
            label="Countries Reached"
            accentColor="rose"
          />
        </div>
      </div>
    </section>
  )
}
