import type { Metadata } from 'next'
import { getPublicAgencyStats, getPublicAgencies } from '@/lib/agencies/getPublicAgencies'
import AgenciesDirectoryClient from './AgenciesDirectoryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getMetadataBase() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

export async function generateMetadata(): Promise<Metadata> {
  const base = getMetadataBase()
  const canonical = base ? `${base}/agencies` : ''

  return {
    title: 'Explore Trusted Real Estate Agencies | India, UAE & Global | MillionFlats',
    description:
      'Discover verified real estate agencies across India, UAE, Saudi Arabia, UK and USA. Compare profiles, explore specializations, and connect with top agencies on MillionFlats.',
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: 'Trusted Real Estate Agencies | MillionFlats',
      description:
        'Browse agency profiles, compare specializations, and connect directly with verified real estate agencies across global markets.',
      url: canonical || undefined,
      type: 'website',
    },
  }
}

export default async function AgenciesDirectoryPage() {
  const [stats, { agencies: initialAgencies }] = await Promise.all([
    getPublicAgencyStats(),
    getPublicAgencies({ sort: 'featured', limit: 100 }),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative overflow-hidden bg-dark-blue">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132a4a]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-500/8 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-400/30 bg-primary-600/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-200 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-300 animate-pulse" />
                Agency Marketplace
              </span>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl leading-tight">
                Explore Trusted{' '}
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                  Real Estate Agencies
                </span>
              </h1>

              <p className="mt-3 text-sm text-white/60 sm:text-base leading-relaxed">
                Discover verified agencies, compare specializations, explore property portfolios and connect with the right team to buy or sell with confidence.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 lg:shrink-0">
              {[
                { icon: '🏢', value: stats.total, label: 'Agencies' },
                { icon: '✅', value: stats.verified, label: 'Verified' },
                { icon: '🌍', value: stats.countries, label: 'Countries' },
                { icon: '📈', value: 'Active', label: 'Markets' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm text-center">
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-white/50 font-medium uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#agency-grid"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-500 px-5 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400"
            >
              Explore Agencies
            </a>
            <a
              href="/agency/auth"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 text-sm font-semibold text-amber-300 backdrop-blur transition-all hover:bg-amber-500/20"
            >
              Become Agency →
            </a>
          </div>
        </div>
      </section>

      {/* ═══════ AGENCY DIRECTORY ═══════ */}
      <AgenciesDirectoryClient initialAgencies={initialAgencies} />

      {/* ═══════ JSON-LD ═══════ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Real Estate Agencies Directory',
            description:
              'Explore trusted real estate agencies across India, UAE, Saudi Arabia, UK and USA on MillionFlats.',
            url: `${getMetadataBase()}/agencies`,
            provider: {
              '@type': 'Organization',
              name: 'MillionFlats',
              url: getMetadataBase() || undefined,
            },
          }),
        }}
      />
    </main>
  )
}
