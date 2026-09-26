import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { getCityOptions, getCommunityOptions, getCountryOptions, normalizeCanonicalCity, normalizeCountryCode } from '@/lib/propertyCanonical'
import { revalidateCanonicalCities } from '@/lib/heroBanners'

function fallbackCities(country: string) {
  return getCityOptions(country).map((city) => ({ id: city.name, name: city.name }))
}

function fallbackCommunities(country: string, city: string) {
  return getCommunityOptions(country, city).map((community) => ({ id: community.name, name: community.name }))
}

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const { searchParams } = new URL(req.url)
  const country = String(searchParams.get('country') || '').toUpperCase()
  const city = String(searchParams.get('city') || '')
  if (!country) {
    const countries = await (prisma as any).country.findMany({ select: { iso2: true, name: true }, orderBy: { name: 'asc' } }).catch(() => [])
    if (!countries.length) {
      return NextResponse.json({ success: true, countries: getCountryOptions().map((item) => ({ iso2: item.iso2, name: item.name })) })
    }
    return NextResponse.json({ success: true, countries })
  }
  const countryIso2 = normalizeCountryCode(country)
  const countryCode = countryIso2 === 'IN' ? 'INDIA' : countryIso2 === 'AE' ? 'UAE' : null
  if (!countryCode) return NextResponse.json({ success: true, cities: [] })
  const dbCities = await (prisma as any).city.findMany({ where: { countryCode }, select: { id: true, name: true }, orderBy: { name: 'asc' } }).catch(() => [])
  const canonicalOnly = searchParams.get('canonicalOnly') === 'true'
  const cities = canonicalOnly
    ? dbCities
    : Array.from(new Map([
        ...fallbackCities(countryIso2).map((item) => [item.name.toLowerCase(), item] as const),
        ...dbCities.map((item: any) => [String(item.name).toLowerCase(), item] as const),
      ]).values()).sort((a: any, b: any) => a.name.localeCompare(b.name))
  if (!city) return NextResponse.json({ success: true, cities })
  const selectedCity = cities.find((item: any) => item.id === city || item.name.toLowerCase() === city.toLowerCase())
  if (!selectedCity) return NextResponse.json({ success: true, cities, communities: fallbackCommunities(countryIso2, city) })
  const dbCommunities = dbCities.length
    ? await (prisma as any).community.findMany({ where: { cityId: selectedCity.id }, select: { id: true, name: true }, orderBy: { name: 'asc' } }).catch(() => [])
    : []
  const communities = dbCommunities.length ? dbCommunities : fallbackCommunities(countryIso2, selectedCity.name)
  return NextResponse.json({ success: true, cities, communities })
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    country: z.enum(['IN', 'AE', 'INDIA', 'UAE']),
    name: z.string().trim().min(2).max(100),
  }).safeParse({
    country: String(body?.country || '').trim().toUpperCase(),
    name: body?.name,
  })
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Enter a valid country and city name.' }, { status: 400 })

  const countryIso2 = normalizeCountryCode(parsed.data.country)
  const countryCode = countryIso2 === 'IN' ? 'INDIA' : 'UAE'
  const name = normalizeCanonicalCity(countryIso2, parsed.data.name)
  const db = prisma as any

  try {
    const existing = await db.city.findFirst({
      where: { countryCode, name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true, countryCode: true },
    })
    if (existing) return NextResponse.json({ success: true, city: existing, created: false })

    const city = await db.city.create({ data: { countryCode, name }, select: { id: true, name: true, countryCode: true } })
    revalidateCanonicalCities()
    return NextResponse.json({ success: true, city, created: true }, { status: 201 })
  } catch (error) {
    console.error('[admin-locations] city create failed', error)
    return NextResponse.json({ success: false, message: 'Could not add this city.' }, { status: 500 })
  }
}
