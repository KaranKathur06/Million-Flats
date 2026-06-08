import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
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

async function getDirectoryStats() {
  try {
    const [developerCount, projectCount, propertyCount] = await Promise.all([
      (prisma as any).developer.count({ where: { status: 'ACTIVE', isDeleted: { not: true } } }),
      (prisma as any).project.count({ where: { status: 'PUBLISHED', isDeleted: false } }),
      (prisma as any).manualProperty.count({ where: { status: 'APPROVED' } }),
    ])
    return {
      developers: developerCount || 0,
      projects: projectCount || 0,
      properties: propertyCount || 0,
      countries: 2,
    }
  } catch {
    return { developers: 0, projects: 0, properties: 0, countries: 2 }
  }
}

export default async function DeveloperDirectoryPage() {
  const stats = await getDirectoryStats()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative overflow-hidden bg-dark-blue">
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132a4a]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-400/30 bg-primary-600/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-200 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-300 animate-pulse" />
              Developer Marketplace
            </span>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-[3.25rem] leading-tight">
              Explore Trusted Real Estate{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                Developers
              </span>
              <br className="hidden sm:inline" />
              Across India &amp; Dubai
            </h1>

            <p className="mt-5 text-base text-white/65 sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Discover verified developers, explore projects, compare portfolios and invest with confidence.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#developer-grid"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-500 px-6 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-400/30"
              >
                Explore Developers
              </a>
              <a
                href="/projects"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
              >
                View Featured Projects
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
              { label: 'Developers Listed', value: stats.developers, icon: '🏗️' },
              { label: 'Projects Listed', value: stats.projects, icon: '🏢' },
              { label: 'Properties Available', value: stats.properties.toLocaleString(), icon: '🏠' },
              { label: 'Countries Covered', value: stats.countries, icon: '🌍' },
            ].map((stat) => (
              <article key={stat.label} className="rounded-xl bg-gray-50 px-4 py-3.5 text-center sm:text-left">
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

      {/* ═══════ DEVELOPER DIRECTORY ═══════ */}
      <DeveloperDirectoryClient />

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
