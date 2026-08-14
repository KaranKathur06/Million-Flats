import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const { searchParams } = new URL(req.url)
  const country = String(searchParams.get('country') || '').toUpperCase()
  const city = String(searchParams.get('city') || '')
  if (!country) {
    const countries = await (prisma as any).country.findMany({ select: { iso2: true, name: true }, orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, countries })
  }
  const countryCode = country === 'IN' ? 'INDIA' : country === 'AE' ? 'UAE' : null
  if (!countryCode) return NextResponse.json({ success: true, cities: [] })
  const cities = await (prisma as any).city.findMany({ where: { countryCode }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  if (!city) return NextResponse.json({ success: true, cities })
  const selectedCity = cities.find((item: any) => item.id === city || item.name.toLowerCase() === city.toLowerCase())
  if (!selectedCity) return NextResponse.json({ success: true, cities, communities: [] })
  const communities = await (prisma as any).community.findMany({ where: { cityId: selectedCity.id }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  return NextResponse.json({ success: true, cities, communities })
}
