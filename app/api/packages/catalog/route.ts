import { NextResponse } from 'next/server'
import { getPackageCatalog, getPackageTaxRateBps, quotePackage } from '@/lib/packageCatalog'

export const runtime = 'nodejs'

export async function GET() {
  const taxRateBps = getPackageTaxRateBps()
  const packages = getPackageCatalog().map((entry) => ({
    ...entry,
    quote: taxRateBps === null ? null : quotePackage(entry.pricePaise, taxRateBps),
  }))

  return NextResponse.json({
    success: true,
    taxConfigured: taxRateBps !== null,
    taxRateBps,
    packages,
  }, { headers: { 'Cache-Control': 'no-store' } })
}