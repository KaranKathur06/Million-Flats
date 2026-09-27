'use client'

import { PackageBuyNowButton } from '@/components/services/PackageBuyNowButton'
import { PackageCatalogStatus } from '@/components/services/PackageCatalogStatus'
import { usePackageCatalog } from '@/hooks/usePackageCatalog'

type PackageInfo = {
  name: string
  subtitle: string
  price: string
  taxNote: string
  featured?: boolean
  features: string[]
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function money(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100)
}

export default function EcosystemPackageCards({ packages }: { packages: PackageInfo[] }) {
  const packageIds = packages.map((pkg) => `ecosystem-partners:${slugify(pkg.name)}`)
  const { state, retry } = usePackageCatalog(packageIds)
  const quotes = state.status === 'ready' ? state.quotes : {}

  return (
    <>
      <div className="mb-5"><PackageCatalogStatus state={state} onRetry={retry} /></div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {packages.map((pkg) => {
          const packageId = `ecosystem-partners:${slugify(pkg.name)}`
          const quote = quotes[packageId] || null
          return (
            <article key={pkg.name} className={`flex flex-col border bg-white p-6 sm:p-8 ${pkg.featured ? 'border-dark-blue/50 ring-1 ring-dark-blue/10' : 'border-gray-200'}`}>
              {pkg.featured ? <p className="text-xs font-bold uppercase tracking-wide text-dark-blue">Recommended</p> : null}
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-gray-500">{pkg.subtitle}</p>
              <h3 className="mt-2 text-2xl font-bold text-dark-blue">{pkg.name}</h3>
              <ul className="mt-5 flex-1 divide-y divide-gray-100 border-y border-gray-100">
                {pkg.features.map((feature) => <li key={feature} className="py-3 text-sm font-medium text-gray-700">{feature}</li>)}
              </ul>
              <p className="mt-5 text-2xl font-bold text-dark-blue">{quote ? money(quote.pricePaise) : pkg.price}</p>
              {quote ? <dl className="mt-3 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><dt>GST</dt><dd>{money(quote.taxAmountPaise)}</dd></div>
                <div className="flex justify-between font-semibold text-dark-blue"><dt>Total payable</dt><dd>{money(quote.totalAmountPaise)}</dd></div>
              </dl> : null}
              <PackageBuyNowButton packageId={packageId} packageName={pkg.name} audience="ECOSYSTEM_PARTNERS" quote={quote} disabledReason={!quote ? 'A verified tax-inclusive total is required before payment.' : undefined} />
            </article>
          )
        })}
      </div>
    </>
  )
}