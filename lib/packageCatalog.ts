import { ECOSYSTEM_PACKAGES, SERVICE_SEGMENTS } from '@/lib/services/segmentContent'

export type PackageAudience = 'DEVELOPERS' | 'AGENCIES' | 'AGENTS' | 'ECOSYSTEM_PARTNERS'

export interface PackageCatalogEntry {
  id: string
  audience: PackageAudience
  name: string
  pricePaise: number
  currency: 'INR'
  taxNote: string
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parsePricePaise(value: string) {
  const rupees = Number(value.replace(/[^0-9]/g, ''))
  if (!Number.isSafeInteger(rupees) || rupees <= 0) {
    throw new Error(`Invalid package price: ${value}`)
  }
  return rupees * 100
}

export function getPackageCatalog(): PackageCatalogEntry[] {
  const segmentEntries = Object.values(SERVICE_SEGMENTS).flatMap((segment) =>
    segment.packages.map((pkg) => ({
      id: `${segment.key}:${slugify(pkg.name)}`,
      audience: segment.key.toUpperCase() as PackageAudience,
      name: pkg.name,
      pricePaise: parsePricePaise(pkg.price),
      currency: 'INR' as const,
      taxNote: pkg.taxNote,
    })),
  )

  const ecosystemEntries = ECOSYSTEM_PACKAGES.map((pkg) => ({
    id: `ecosystem-partners:${slugify(pkg.name)}`,
    audience: 'ECOSYSTEM_PARTNERS' as const,
    name: pkg.name,
    pricePaise: parsePricePaise(pkg.price),
    currency: 'INR' as const,
    taxNote: pkg.taxNote,
  }))

  return [...segmentEntries, ...ecosystemEntries]
}

export function getPackageTaxRateBps() {
  const value = process.env.PACKAGE_GST_RATE_BPS
  if (!value) return null
  const rate = Number(value)
  if (!Number.isInteger(rate) || rate < 0 || rate > 10000) return null
  return rate
}

export function quotePackage(pricePaise: number, taxRateBps: number) {
  const taxAmountPaise = Math.round((pricePaise * taxRateBps) / 10000)
  return {
    pricePaise,
    taxAmountPaise,
    totalAmountPaise: pricePaise + taxAmountPaise,
  }
}

export function findPackageById(id: string) {
  return getPackageCatalog().find((entry) => entry.id === id) || null
}