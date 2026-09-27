import { afterEach, describe, expect, it } from '@jest/globals'
import { findPackageById, getPackageCatalog, getPackageTaxRateBps, quotePackage } from '@/lib/packageCatalog'

const originalTaxRate = process.env.PACKAGE_GST_RATE_BPS

afterEach(() => {
  if (originalTaxRate === undefined) delete process.env.PACKAGE_GST_RATE_BPS
  else process.env.PACKAGE_GST_RATE_BPS = originalTaxRate
})

describe('package catalog', () => {
  it('builds stable package IDs and reads prices from the existing approved content', () => {
    expect(findPackageById('developers:annual-essential')).toMatchObject({
      audience: 'DEVELOPERS',
      name: 'Annual Essential',
      pricePaise: 9_900_000,
    })
    expect(findPackageById('agencies:boutique-agency-suite')).toMatchObject({
      audience: 'AGENCIES',
      pricePaise: 8_900_000,
    })
    expect(findPackageById('ecosystem-partners:verified-partner-suite')).toMatchObject({
      audience: 'ECOSYSTEM_PARTNERS',
      pricePaise: 1_900_000,
    })
    expect(getPackageCatalog()).toHaveLength(8)
  })

  it('calculates tax and total using the configured basis-point rate', () => {
    expect(quotePackage(9_900_000, 1800)).toEqual({
      pricePaise: 9_900_000,
      taxAmountPaise: 1_782_000,
      totalAmountPaise: 11_682_000,
    })
  })

  it('does not invent a tax rate when configuration is missing or invalid', () => {
    delete process.env.PACKAGE_GST_RATE_BPS
    expect(getPackageTaxRateBps()).toBeNull()
    process.env.PACKAGE_GST_RATE_BPS = 'gst'
    expect(getPackageTaxRateBps()).toBeNull()
  })
})