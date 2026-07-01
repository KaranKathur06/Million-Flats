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
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132a4a]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-400/30 bg-primary-600/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-200 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-300 animate-pulse" />
              Agency Marketplace
            </span>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-[3.25rem] leading-tight">
              Explore Trusted Real Estate{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                Agencies
              </span>
              <br className="hidden sm:inline" />
              Across Global Markets
            </h1>

            <p className="mt-5 text-base text-white/65 sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Discover verified agencies, compare specializations, explore property portfolios and
              connect with the right team to buy or sell with confidence.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#agency-grid"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-500 px-6 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-400/30"
              >
                Explore Agencies
              </a>
              <a
                href="/properties"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
              >
                View Properties
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ GLOBAL STATS BAR ═══════ */}
      <section className="relative z-10 -mt-8">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg shadow-black/5 sm:grid-cols-4 sm:gap-5 sm:p-6">
            {[
              { label: 'Agencies Listed', value: stats.total, icon: '🏢' },
              { label: 'Verified Agencies', value: stats.verified, icon: '✅' },
              { label: 'Countries Covered', value: stats.countries, icon: '🌍' },
              { label: 'Global Markets', value: 'Active', icon: '📈' },
            ].map((stat) => (
              <article
                key={stat.label}
                className="rounded-xl bg-gray-50 px-4 py-3.5 text-center sm:text-left"
              >
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-lg">{stat.icon}</span>
                  <p className="text-xl font-bold text-dark-blue sm:text-2xl">{stat.value}</p>
                </div>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">{stat.label}</p>
              </article>
            ))}
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
