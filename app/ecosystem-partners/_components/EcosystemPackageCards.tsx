'use client'

import { useEffect, useState } from 'react'
import { PackageBuyNowButton } from '@/components/services/PackageBuyNowButton'

type PackageInfo = {
  name: string
  subtitle: string
  price: string
  taxNote: string
  featured?: boolean
  features: string[]
}

type PackageQuote = { pricePaise: number; taxAmountPaise: number; totalAmountPaise: number }

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function money(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100)
}

export default function EcosystemPackageCards({ packages }: { packages: PackageInfo[] }) {
  const [quotes, setQuotes] = useState<Record<string, PackageQuote>>({})
  const [taxConfigured, setTaxConfigured] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/packages/catalog')
      .then((response) => response.json())
      .then((data) => {
        if (!active || !data.success) return
        setTaxConfigured(Boolean(data.taxConfigured))
        const next: Record<string, PackageQuote> = {}
        for (const entry of data.packages || []) {
          if (entry.quote) next[entry.id] = entry.quote
        }
        setQuotes(next)
      })
      .catch(() => { if (active) setTaxConfigured(false) })
    return () => { active = false }
  }, [])

  return (
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
            </dl> : <p className="mt-2 text-xs text-gray-500">{taxConfigured ? 'Price quote unavailable.' : 'Tax details are being loaded.'}</p>}
            <PackageBuyNowButton packageId={packageId} packageName={pkg.name} audience="ECOSYSTEM_PARTNERS" quote={quote} disabledReason={!quote ? 'Checkout is unavailable until the full payable amount can be shown.' : undefined} />
          </article>
        )
      })}
    </div>
  )
}