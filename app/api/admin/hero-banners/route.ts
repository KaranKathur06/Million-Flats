import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { heroBannerScopeKey, revalidateHeroBannerSurfaces } from '@/lib/heroBanners'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CategorySchema = z.enum(['BUY', 'RENT', 'PROJECTS', 'GENERIC'])
const CountrySchema = z.enum(['INDIA', 'UAE'])

function parseScopeInput(body: any) {
  const parsed = z.object({
    scope: z.enum(['CITY', 'COUNTRY', 'GLOBAL']),
    category: CategorySchema,
    cityId: z.string().trim().min(1).optional(),
    countryCode: CountrySchema.optional(),
    headline: z.string().trim().max(200).optional().default(''),
    subheadline: z.string().trim().max(500).optional().default(''),
    desktopImageAlt: z.string().trim().max(300).optional().default(''),
    mobileImageAlt: z.string().trim().max(300).optional().default(''),
  }).safeParse(body)
  if (!parsed.success) return { error: 'Enter valid banner details.' } as const

  const value = parsed.data
  if ((value.scope === 'CITY' && !value.cityId) || (value.scope === 'COUNTRY' && !value.countryCode) || (value.scope === 'GLOBAL' && (value.cityId || value.countryCode))) {
    return { error: 'The selected banner scope is incomplete.' } as const
  }
  if (value.category === 'GENERIC' && value.scope !== 'CITY') return { error: 'Generic banners must be assigned to a city.' } as const
  return { value } as const
}

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  const params = new URL(req.url).searchParams
  const query = params.get('search')?.trim() || ''
  const cityId = params.get('cityId')?.trim()
  const category = CategorySchema.safeParse(params.get('category')?.toUpperCase())
  const status = params.get('status')

  try {
    const records = await (prisma as any).heroBanner.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(category.success ? { category: category.data } : {}),
        ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
        ...(query ? {
          OR: [
            { headline: { contains: query, mode: 'insensitive' } },
            { city: { name: { contains: query, mode: 'insensitive' } } },
            { scopeKey: { contains: query, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: { city: { select: { id: true, name: true, countryCode: true } } },
      orderBy: [{ scope: 'asc' }, { category: 'asc' }, { updatedAt: 'desc' }],
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('[admin-hero-banners] list failed', error)
    return NextResponse.json({ success: false, message: 'Could not load hero banners.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const body = await req.json().catch(() => null)
  const parsed = parseScopeInput(body)
  if ('error' in parsed) return NextResponse.json({ success: false, message: parsed.error }, { status: 400 })

  const value = parsed.value
  const db = prisma as any
  try {
    let city: { id: string; name: string; countryCode: 'INDIA' | 'UAE' } | null = null
    if (value.scope === 'CITY') {
      city = await db.city.findUnique({ where: { id: value.cityId }, select: { id: true, name: true, countryCode: true } })
      if (!city) return NextResponse.json({ success: false, message: 'Select a configured city.' }, { status: 404 })
    }

    const countryCode = value.scope === 'CITY' ? city?.countryCode : value.scope === 'COUNTRY' ? value.countryCode : null
    const scopeKey = value.scope === 'CITY'
      ? heroBannerScopeKey('CITY', { cityId: city!.id })
      : value.scope === 'COUNTRY'
        ? heroBannerScopeKey('COUNTRY', { countryCode: countryCode! })
        : 'global'
    const existing = await db.heroBanner.findUnique({ where: { scopeKey_category: { scopeKey, category: value.category } } })
    const data = {
      scope: value.scope,
      scopeKey,
      category: value.category,
      cityId: city?.id || null,
      countryCode,
      headline: value.headline,
      subheadline: value.subheadline,
      desktopImageAlt: value.desktopImageAlt,
      mobileImageAlt: value.mobileImageAlt,
      updatedBy: auth.userId,
    }
    const banner = existing
      ? await db.heroBanner.update({ where: { id: existing.id }, data, include: { city: true } })
      : await db.heroBanner.create({ data: { ...data, isActive: false, createdBy: auth.userId }, include: { city: true } })

    await writeAuditLog({
      entityType: 'HERO_BANNER',
      entityId: banner.id,
      action: existing ? 'ADMIN_HERO_BANNER_UPDATED' : 'ADMIN_HERO_BANNER_CREATED',
      performedByUserId: auth.userId,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip'),
      beforeState: existing ? { headline: existing.headline, subheadline: existing.subheadline, isActive: existing.isActive } : null,
      afterState: { scope: banner.scope, scopeKey, category: banner.category, headline: banner.headline, isActive: banner.isActive },
    })
    await revalidateHeroBannerSurfaces(scopeKey, value.category)
    return NextResponse.json({ success: true, data: banner }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('[admin-hero-banners] save failed', error)
    return NextResponse.json({ success: false, message: 'Could not save hero banner.' }, { status: 500 })
  }
}