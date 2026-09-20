import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { MANUAL_PROPERTY_PUBLIC_STATUS } from '@/lib/manualPropertyLifecycle'
import { getCityOptions, normalizeCanonicalCity, normalizeCountryCode, normalizeText } from '@/lib/propertyCanonical'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  country: z.enum(['UAE', 'INDIA']),
  city: z.string().trim().max(120).optional(),
})

function uniqueSorted(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function canonicalCityNames(country: 'UAE' | 'INDIA', values: unknown[]) {
  const countryCode = normalizeCountryCode(country)
  const names = new Map<string, string>()

  for (const value of values) {
    const canonical = normalizeCanonicalCity(countryCode, String(value || ''))
    const key = normalizeText(canonical).toLowerCase()
    if (key && !names.has(key)) names.set(key, canonical)
  }

  return Array.from(names.values()).sort((a, b) => a.localeCompare(b))
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const parsed = QuerySchema.safeParse({
      country: (url.searchParams.get('country') || '').trim().toUpperCase(),
      city: url.searchParams.get('city') || undefined,
    })

    if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid location filters' }, { status: 400 })

    const { country, city } = parsed.data
    const propertyWhere: any = {
      status: MANUAL_PROPERTY_PUBLIC_STATUS,
      sourceType: 'MANUAL',
      countryCode: country,
      agent: { approved: true, user: { status: 'ACTIVE' } },
    }
    if (city) propertyWhere.city = { equals: city, mode: 'insensitive' }

    const rows = city ? await (prisma as any).manualProperty.findMany({
      where: propertyWhere,
      select: { region: true, city: true, locality: true, community: true },
      distinct: ['region', 'city', 'locality', 'community'],
    }) : []

    const localities = uniqueSorted(rows.flatMap((row: any) => [row.locality, row.community]))

    const canonicalCountry = normalizeCountryCode(country)
    const canonicalCountryCode = canonicalCountry === 'AE' ? 'UAE' : 'INDIA'
    const canonicalCityRows = await (prisma as any).city.findMany({
      where: { countryCode: canonicalCountryCode },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    const cities = canonicalCityNames(country, canonicalCityRows.length ? canonicalCityRows.map((row: any) => row.name) : getCityOptions(canonicalCountry).map((row) => row.name))

    const selectedCanonicalName = city ? normalizeCanonicalCity(canonicalCountry, city) : ''
    const selectedCanonicalCity = selectedCanonicalName
      ? canonicalCityRows.find((row: any) => normalizeText(row.name).toLowerCase() === normalizeText(selectedCanonicalName).toLowerCase())
      : null
    const canonicalCommunityRows = await (prisma as any).community.findMany({
      where: selectedCanonicalCity ? { cityId: selectedCanonicalCity.id } : {},
      select: { name: true, city: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    const fallbackCities = uniqueSorted([
      ...cities,
    ])
    const fallbackLocalities = uniqueSorted([
      ...localities,
      ...canonicalCommunityRows
        .filter((row: any) => !city || normalizeText(row.city?.name).toLowerCase() === normalizeText(selectedCanonicalName).toLowerCase())
        .map((row: any) => row.name),
    ])

    return NextResponse.json({
      success: true,
      country,
      cities: fallbackCities,
      localities: fallbackLocalities,
      hasOptions: fallbackCities.length > 0 || fallbackLocalities.length > 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Property locations: failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load locations' }, { status: 500 })
  }
}
