import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { getCityOptions, getCommunityOptions, getCountryOptions, normalizeCountryCode } from '@/lib/propertyCanonical'

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
  const cities = dbCities.length ? dbCities : fallbackCities(countryIso2)
  if (!city) return NextResponse.json({ success: true, cities })
  const selectedCity = cities.find((item: any) => item.id === city || item.name.toLowerCase() === city.toLowerCase())
  if (!selectedCity) return NextResponse.json({ success: true, cities, communities: fallbackCommunities(countryIso2, city) })
  const dbCommunities = dbCities.length
    ? await (prisma as any).community.findMany({ where: { cityId: selectedCity.id }, select: { id: true, name: true }, orderBy: { name: 'asc' } }).catch(() => [])
    : []
  const communities = dbCommunities.length ? dbCommunities : fallbackCommunities(countryIso2, selectedCity.name)
  return NextResponse.json({ success: true, cities, communities })
}
