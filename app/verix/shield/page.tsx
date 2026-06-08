import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VerixShield™ Price Intelligence | MillionFlats',
  description: 'AI-powered price intelligence engine that calculates fair market value, detects anomalies, and provides actionable negotiation insights for every property on MillionFlats.',
}

const FEATURES = [
  {
    icon: '🎯',
    title: 'Fair Market Valuation',
    description: 'Our statistical engine analyzes comparable sales, market listings, and location-specific data to estimate the true value range of any property.',
    color: 'from-blue-500/15 to-cyan-500/10',
    border: 'border-blue-500/15',
  },
  {
    icon: '📊',
    title: 'Price Trend Analysis',
    description: '12-month price trend visualization showing area-level price-per-sqft movements, helping you understand if it\'s a buyer\'s or seller\'s market.',
    color: 'from-emerald-500/15 to-green-500/10',
    border: 'border-emerald-500/15',
  },
  {
    icon: '🏘️',
    title: 'Comparable Properties',
    description: 'Similarity-scored comparable listings within the same community, ranked by distance, size, and configuration match.',
    color: 'from-amber-500/15 to-orange-500/10',
    border: 'border-amber-500/15',
  },
  {
    icon: '📡',
    title: 'Market Signals',
    description: 'Real-time demand score, supply analysis, listing velocity, and days-on-market metrics give you the pulse of the market.',
    color: 'from-purple-500/15 to-violet-500/10',
    border: 'border-purple-500/15',
  },
  {
    icon: '🛡️',
    title: 'Anomaly Detection',
    description: 'Automatic classification into Fair, Overpriced, Underpriced, or Suspicious — protecting buyers from overpaying and flagging potential scam listings.',
    color: 'from-red-500/15 to-rose-500/10',
    border: 'border-red-500/15',
  },
  {
    icon: '💰',
    title: 'Negotiation Intelligence',
    description: 'Data-backed suggested offer range and negotiation strategy text, personalized to each property\'s market position.',
    color: 'from-teal-500/15 to-cyan-500/10',
    border: 'border-teal-500/15',
  },
]

const HOW_IT_WORKS = [
  { step: '01', label: 'Data Collection', detail: 'We scan market listings, historical transactions, and price trends across 20+ Dubai communities.' },
  { step: '02', label: 'Valuation Engine', detail: 'Statistical model with IQR outlier removal, location multipliers, and property-type adjustments calculates fair value range.' },
  { step: '03', label: 'Comparable Matching', detail: 'Haversine distance + similarity scoring finds the most relevant comparable properties within a 3km radius.' },
  { step: '04', label: 'Risk Classification', detail: 'Rule engine applies deviation thresholds to classify as Fair, Overpriced, Underpriced, or Suspicious.' },
  { step: '05', label: 'Intelligence Delivery', detail: 'Results are cached for 6 hours, served via API, and rendered as a premium analytics panel on every property page.' },
]

const STATS = [
  { value: '20+', label: 'Dubai Communities' },
  { value: '500+', label: 'Market Data Points' },
  { value: '5', label: 'Engine Modules' },
  { value: '6h', label: 'Smart Cache TTL' },
]

export default function VerixShieldPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0a1628] via-[#0d1f38] to-[#132d50] py-20 sm:py-28">
        {/* Ambient effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/3 rounded-full blur-3xl pointer-events-none" />

        <div className="relative container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/20">
              <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400/70">Price Intelligence Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
            VerixShield<sup className="text-lg text-blue-400/60">™</sup>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/45 leading-relaxed">
            Every property on MillionFlats is backed by real-time price intelligence.
            Know if a deal is fair, overpriced, or a hidden gem — before you commit.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/properties" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0a1628] text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg shadow-white/5">
              Browse Properties
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/projects" className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.06] text-white/70 text-sm font-semibold rounded-xl border border-white/[0.08] hover:bg-white/[0.1] hover:text-white transition-colors">
              View Projects
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className="text-center px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="text-2xl font-bold text-white/80 font-mono">{s.value}</div>
                <div className="text-[11px] text-white/30 uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">What VerixShield Analyzes</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Six intelligence modules working in parallel to give you the complete picture on every listing.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className={`relative p-6 rounded-2xl bg-gradient-to-br ${f.color} border ${f.border} group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}>
                <span className="text-2xl">{f.icon}</span>
                <h3 className="text-base font-bold text-gray-900 mt-3">{f.title}</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">How It Works</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">From raw market data to actionable intelligence — in under one second.</p>
          </div>

          <div className="relative max-w-2xl mx-auto">
            {/* Connection line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-px bg-gradient-to-b from-blue-400/20 via-emerald-400/20 to-amber-400/20" />

            <div className="space-y-6">
              {HOW_IT_WORKS.map((item, i) => (
                <div key={i} className="relative flex gap-5 items-start">
                  <div className="relative z-10 flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#0a1628] to-[#132d50] text-white/70 font-mono font-bold text-sm border border-white/10 flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-base font-bold text-gray-900">{item.label}</h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Classification System ── */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Price Classification</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Every listing gets an automatic status based on how its asking price compares to fair market value.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { status: 'Fair Price', color: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-800', desc: 'Within ±15% of estimated fair value' },
              { status: 'Overpriced', color: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500', text: 'text-orange-800', desc: 'More than 15% above market estimate' },
              { status: 'Below Market', color: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500', text: 'text-blue-800', desc: 'More than 15% below — potential deal' },
              { status: 'Suspicious', color: 'bg-red-50 border-red-200', dot: 'bg-red-500', text: 'text-red-800', desc: 'Over 30% below — verify authenticity' },
            ].map((c, i) => (
              <div key={i} className={`p-5 rounded-2xl border ${c.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={`text-sm font-bold ${c.text}`}>{c.status}</span>
                </div>
                <p className="text-xs text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132d50] p-10 sm:p-14 text-center border border-white/[0.05]">
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="relative text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Start Making Smarter Property Decisions
            </h2>
            <p className="relative mt-3 text-white/40 max-w-md mx-auto text-sm">
              Open any property or project listing on MillionFlats to see VerixShield in action. No signup required.
            </p>
            <div className="relative flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/properties" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0a1628] text-sm font-bold rounded-xl hover:bg-white/90 transition-colors shadow-lg">
                Explore Properties →
              </Link>
              <Link href="/projects" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/[0.06] text-white/70 text-sm font-semibold rounded-xl border border-white/[0.08] hover:bg-white/[0.1] transition-colors">
                View Projects →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
