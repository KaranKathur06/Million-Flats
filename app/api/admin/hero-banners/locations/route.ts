import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { MANUAL_PROPERTY_PUBLIC_STATUS } from '@/lib/manualPropertyLifecycle'
import { buildHeroBannerCityOptions } from '@/lib/heroBannerCityOptions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CountrySchema = z.enum(['INDIA', 'UAE'])

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  const countryResult = CountrySchema.safeParse(new URL(req.url).searchParams.get('country')?.trim().toUpperCase())
  if (!countryResult.success) return NextResponse.json({ success: false, message: 'Select a valid market.' }, { status: 400 })
  const countryCode = countryResult.data
  const countryIso2 = countryCode === 'INDIA' ? 'IN' : 'AE'
  const db = prisma as any

  try {
    const [canonicalCities, propertyCities, projectCities] = await Promise.all([
      db.city.findMany({ where: { countryCode }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      db.manualProperty.findMany({
        where: {
          status: MANUAL_PROPERTY_PUBLIC_STATUS,
          sourceType: 'MANUAL',
          countryCode,
          city: { not: null },
          agent: { approved: true, user: { status: 'ACTIVE' } },
        },
        select: { city: true },
        distinct: ['city'],
        orderBy: { city: 'asc' },
      }),
      db.project.findMany({
        where: { status: 'PUBLISHED', isDeleted: false, countryIso2, city: { not: null } },
        select: { city: true },
        distinct: ['city'],
        orderBy: { city: 'asc' },
      }),
    ])

    const cities = buildHeroBannerCityOptions({
      countryCode,
      canonicalCities,
      propertyCities: propertyCities.map((row: any) => ({ name: String(row.city || '').trim() })),
      projectCities: projectCities.map((row: any) => ({ name: String(row.city || '').trim() })),
    })

    return NextResponse.json({
      success: true,
      cities,
      inventoryCounts: {
        locations: canonicalCities.length,
        properties: propertyCities.length,
        projects: projectCities.length,
      },
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch (error) {
    console.error('[admin-hero-banners] inventory cities failed', { countryIso2, error })
    return NextResponse.json({ success: false, message: 'Could not load cities from the current property and project inventory.' }, { status: 500 })
  }
}