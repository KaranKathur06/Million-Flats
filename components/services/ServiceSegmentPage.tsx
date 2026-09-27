'use client'

import Link from 'next/link'
import MillionFlatsButton from '@/components/ui/MillionFlatsButton'
import ServicePageAnalytics from '@/components/services/ServicePageAnalytics'
import { PackageBuyNowButton } from '@/components/services/PackageBuyNowButton'
import { PackageCatalogStatus } from '@/components/services/PackageCatalogStatus'
import { usePackageCatalog } from '@/hooks/usePackageCatalog'
import type { ServiceSegment } from '@/lib/services/segmentContent'

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatRupees(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100)
}

function PackageCard({ segment, packageInfo, index, quote }: {
  segment: ServiceSegment
  packageInfo: ServiceSegment['packages'][number]
  index: number
  quote: { pricePaise: number; taxAmountPaise: number; totalAmountPaise: number } | null
}) {
  const packageId = `${segment.key}:${slugify(packageInfo.name)}`
  return (
    <article className={`flex h-full flex-col border bg-white p-6 shadow-sm sm:p-8 ${packageInfo.featured ? 'border-dark-blue/50 ring-1 ring-dark-blue/10' : 'border-gray-200'}`}>
      {packageInfo.featured ? <p className="mb-3 text-xs font-bold uppercase tracking-wide text-dark-blue">Recommended</p> : null}
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Package {String.fromCharCode(65 + index)}</p>
      <h3 className="mt-2 text-2xl font-bold text-dark-blue">{packageInfo.name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">{packageInfo.subtitle}</p>
      <ul className="mt-6 flex-1 divide-y divide-gray-100 border-y border-gray-100">
        {packageInfo.features.map((feature) => (
          <li key={feature.title} className="py-4">
            <h4 className="text-sm font-semibold text-gray-900">{feature.title}</h4>
            <p className="mt-1 text-sm leading-5 text-gray-600">{feature.description}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <p className="text-2xl font-bold text-dark-blue">{quote ? formatRupees(quote.pricePaise) : packageInfo.price}<span className="ml-1 text-sm font-medium text-gray-500">/ YEAR</span></p>
        {quote ? (
          <dl className="mt-3 space-y-1 text-xs text-gray-600">
            <div className="flex justify-between gap-3"><dt>GST</dt><dd>{formatRupees(quote.taxAmountPaise)}</dd></div>
            <div className="flex justify-between gap-3 font-semibold text-dark-blue"><dt>Total payable</dt><dd>{formatRupees(quote.totalAmountPaise)}</dd></div>
          </dl>
        ) : null}
        <PackageBuyNowButton
          packageId={packageId}
          packageName={packageInfo.name}
          audience={segment.key.toUpperCase()}
          quote={quote}
          disabledReason={!quote ? 'A verified tax-inclusive total is required before payment.' : undefined}
        />
      </div>
    </article>
  )
}

export default function ServiceSegmentPage({ segment }: { segment: ServiceSegment }) {
  const packageIds = segment.packages.map((packageInfo) => `${segment.key}:${slugify(packageInfo.name)}`)
  const { state: packageCatalog, retry } = usePackageCatalog(packageIds)
  const quotes = packageCatalog.status === 'ready' ? packageCatalog.quotes : {}

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <ServicePageAnalytics segment={segment.key} />
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{segment.eyebrow}</p>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-dark-blue sm:text-5xl">{segment.headline}<span className="mt-2 block text-gray-700">{segment.highlightedHeadline}</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600">{segment.key === 'developers' ? 'Accelerate inventory absorption and connect directly with high-intent buyers, HNIs, and NRI investors through automated AI calling, verified listings, and multi-channel outreach campaigns.' : segment.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <MillionFlatsButton href="#plans" variant="primary" size="md" className="w-full sm:w-auto">View {segment.key === 'developers' ? 'Developer' : segment.key === 'agencies' ? 'Agency' : 'Agent'} Plans</MillionFlatsButton>
            </div>
          </div>
          <div className="border-l-2 border-amber-500 pl-6 lg:ml-auto lg:max-w-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">One connected growth path</p>
            <p className="mt-3 text-lg font-semibold leading-7 text-dark-blue">Verified identity <span aria-hidden="true">→</span> trusted inventory <span aria-hidden="true">→</span> qualified demand</p>
            <p className="mt-3 text-sm leading-6 text-gray-600">Built around the profiles, portals, and lead tools already available in MillionFlats.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8" id="plans">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Growth packages</p>
            <h2 className="mt-2 text-3xl font-bold text-dark-blue">Choose your growth infrastructure</h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-gray-600">Choose a package and complete secure payment. Account creation is optional and can happen after purchase.</p>
        </div>
        <div className="mb-5"><PackageCatalogStatus state={packageCatalog} onRetry={retry} /></div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {segment.packages.map((packageInfo, index) => {
            const packageId = `${segment.key}:${slugify(packageInfo.name)}`
            return <PackageCard key={packageInfo.name} segment={segment} packageInfo={packageInfo} index={index} quote={quotes[packageId] || null} />
          })}
        </div>
      </section>

      {segment.key === 'agents' ? (
        <section className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">A connected agent profile</p>
              <h2 className="mt-3 text-3xl font-bold text-dark-blue">Trust signals that work together</h2>
              <p className="mt-4 text-sm leading-6 text-gray-600">Your subscription connects the agent dashboard to a complete public profile, verification, inventory, and lead workflow.</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {['Subscription', 'Agent dashboard', 'Professional identity, agency affiliation & license', 'Experience, service areas & specialization', 'AIPro™ score, badges & verification', 'Listings, reviews, media & performance', 'Lead generation and CRM / WhatsApp'].map((step, index) => (
                <li key={step} className="flex items-center gap-3 border border-gray-200 bg-white p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-dark-blue">{index + 1}</span>
                  <span className="text-sm font-semibold text-gray-800">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-t border-gray-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-dark-blue">Explore the MillionFlats ecosystem</h2>
            <p className="mt-2 text-sm text-gray-600">Move between growth tools, public profiles, property inventory, and direct support.</p>
          </div>
          <nav aria-label="Related MillionFlats destinations" className="flex flex-wrap gap-x-5 gap-y-3">
            {segment.relatedLinks.map((link) => <Link key={link.href} href={link.href} className="text-sm font-semibold text-dark-blue underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-blue/40">{link.label}</Link>)}
          </nav>
        </div>
      </section>
    </main>
  )
}