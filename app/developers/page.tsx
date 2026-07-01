import type { Metadata } from 'next'
import { getPublicDeveloperStats, getPublicDevelopers } from '@/lib/developers/getPublicDevelopers'
import DeveloperDirectoryClient from './DeveloperDirectoryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getMetadataBase() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

export async function generateMetadata(): Promise<Metadata> {
  const base = getMetadataBase()
  const canonical = base ? `${base}/developers` : ''

  return {
    title: 'Explore Trusted Real Estate Developers | India & Dubai | MillionFlats',
    description:
      'Discover verified real estate developers across India and Dubai. Compare portfolios, explore projects, read developer profiles and invest with confidence on MillionFlats.',
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: 'Trusted Real Estate Developers | MillionFlats',
      description:
        'Browse developer profiles, compare project portfolios, and connect directly with India & Dubai\'s top builders.',
      url: canonical || undefined,
      type: 'website',
    },
  }
}

export default async function DeveloperDirectoryPage() {
  const [stats, { developers: initialDevelopers }] = await Promise.all([
    getPublicDeveloperStats(),
    getPublicDevelopers({ sort: 'featured', limit: 100 }),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative overflow-hidden bg-dark-blue">
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132a4a]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-500/8 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Title + description */}
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-400/30 bg-primary-600/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-200 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-300 animate-pulse" />
                Developer Marketplace
              </span>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl leading-tight">
                Explore Trusted{' '}
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                  Real Estate Developers
                </span>
              </h1>

              <p className="mt-3 text-sm text-white/60 sm:text-base leading-relaxed">
                Verified builders across global markets — compare portfolios, explore projects, invest with confidence.
              </p>
            </div>

            {/* Right: Quick stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 lg:shrink-0">
              {[
                { icon: '🏗️', value: stats.developers, label: 'Developers' },
                { icon: '🏢', value: stats.projects, label: 'Projects' },
                { icon: '🌍', value: stats.countries, label: 'Countries' },
                { icon: '🏠', value: stats.properties.toLocaleString(), label: 'Properties' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm text-center">
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-white/50 font-medium uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#developer-grid"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-500 px-5 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400"
            >
              Browse Developers
            </a>
            <a
              href="/developer/auth"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 text-sm font-semibold text-amber-300 backdrop-blur transition-all hover:bg-amber-500/20"
            >
              Join as Developer →
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar is now inline in hero — remove duplicate section */}

      {/* ═══════ DEVELOPER DIRECTORY ═══════ */}
      <DeveloperDirectoryClient initialDevelopers={initialDevelopers} />

      {/* ═══════ JSON-LD ═══════ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Real Estate Developers Directory',
            description: 'Explore trusted real estate developers across India and Dubai on MillionFlats.',
            url: `${getMetadataBase()}/developers`,
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
