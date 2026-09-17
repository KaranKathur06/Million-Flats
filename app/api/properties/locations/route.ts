import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { MANUAL_PROPERTY_PUBLIC_STATUS } from '@/lib/manualPropertyLifecycle'
import { normalizeCountryCode } from '@/lib/propertyCanonical'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  country: z.enum(['UAE', 'INDIA']),
  region: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
})

function uniqueSorted(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const parsed = QuerySchema.safeParse({
      country: (url.searchParams.get('country') || '').trim().toUpperCase(),
      region: url.searchParams.get('region') || undefined,
      city: url.searchParams.get('city') || undefined,
    })

    if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid location filters' }, { status: 400 })

    const { country, region, city } = parsed.data
    const propertyWhere: any = {
      status: MANUAL_PROPERTY_PUBLIC_STATUS,
      sourceType: 'MANUAL',
      countryCode: country,
      agent: { approved: true, user: { status: 'ACTIVE' } },
    }
    if (region) propertyWhere.region = { equals: region, mode: 'insensitive' }
    if (city) propertyWhere.city = { equals: city, mode: 'insensitive' }

    const rows = await (prisma as any).manualProperty.findMany({
      where: propertyWhere,
      select: { region: true, city: true, locality: true, community: true },
      distinct: ['region', 'city', 'locality', 'community'],
    })

    const states = uniqueSorted(rows.map((row: any) => row.region))
    const cities = uniqueSorted(rows.map((row: any) => row.city))
    const localities = uniqueSorted(rows.flatMap((row: any) => [row.locality, row.community]))

    const canonicalCountry = normalizeCountryCode(country)
    const canonicalCityRows = await (prisma as any).city.findMany({
      where: { countryCode: canonicalCountry === 'AE' ? 'UAE' : 'INDIA' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    const selectedCanonicalCity = city
      ? canonicalCityRows.find((row: any) => String(row.name).toLowerCase() === city.toLowerCase())
      : null
    const canonicalCommunityRows = await (prisma as any).community.findMany({
      where: selectedCanonicalCity ? { cityId: selectedCanonicalCity.id } : {},
      select: { name: true, city: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    const fallbackCities = uniqueSorted([
      ...cities,
      ...canonicalCityRows.map((row: any) => row.name),
    ])
    const fallbackLocalities = uniqueSorted([
      ...localities,
      ...canonicalCommunityRows
        .filter((row: any) => !city || String(row.city?.name || '').toLowerCase() === city.toLowerCase())
        .map((row: any) => row.name),
    ])

    return NextResponse.json({
      success: true,
      country,
      states,
      cities: fallbackCities,
      localities: fallbackLocalities,
      hasOptions: states.length > 0 || fallbackCities.length > 0 || fallbackLocalities.length > 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Property locations: failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load locations' }, { status: 500 })
  }
}
