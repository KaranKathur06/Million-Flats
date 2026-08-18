import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import {
  getMarketConfiguration,
  getCityConfiguration,
  updateMarketPriority,
  updateCityPriority,
} from '@/lib/services/ProjectListingService'
import { z } from 'zod'

const updateMarketSchema = z.object({
  countryIso2: z.string().length(2),
  priority: z.number().int().positive(),
})

const updateCitySchema = z.object({
  countryIso2: z.string().length(2),
  cityName: z.string().min(1).max(100),
  priority: z.number().int().positive(),
})

/**
 * GET /api/admin/projects/market-config
 * Returns market and city priority configurations
 *
 * Query params:
 *   - country?: ISO2 code to filter cities (e.g., "AE")
 */
export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }
  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    const countryFilter = url.searchParams.get('country')

    const markets = await getMarketConfiguration()

    const citiesData: Record<string, any[]> = {}
    if (countryFilter) {
      citiesData[countryFilter] = await getCityConfiguration(countryFilter)
    } else {
      // Load cities for all active markets
      for (const market of markets) {
        citiesData[market.countryIso2] = await getCityConfiguration(market.countryIso2)
      }
    }

    return NextResponse.json({
      success: true,
      result: {
        markets,
        cities: citiesData,
      },
    })
  } catch (err: any) {
    console.error('[GET /api/admin/projects/market-config]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/projects/market-config
 * Update market or city priority
 *
 * Request body (one of):
 *   { type: "market", countryIso2: "AE", priority: 1 }
 *   { type: "city", countryIso2: "AE", cityName: "Dubai", priority: 1 }
 */
export async function PUT(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }
  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid body' }, { status: 400 })
  }

  const { type } = body

  try {
    if (type === 'market') {
      const parsed = updateMarketSchema.parse(body)
      await updateMarketPriority(parsed.countryIso2, parsed.priority)

      // Invalidate cache
      revalidatePath('/projects')
      revalidatePath('/admin/projects')

      return NextResponse.json({
        success: true,
        result: { type: 'market', ...parsed },
      })
    } else if (type === 'city') {
      const parsed = updateCitySchema.parse(body)
      await updateCityPriority(parsed.countryIso2, parsed.cityName, parsed.priority)

      // Invalidate cache
      revalidatePath('/projects')
      revalidatePath('/admin/projects')

      return NextResponse.json({
        success: true,
        result: { type: 'city', ...parsed },
      })
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid type: must be "market" or "city"' },
        { status: 400 }
      )
    }
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ success: false, message: 'Validation error', errors: err.errors }, { status: 400 })
    }
    console.error('[PUT /api/admin/projects/market-config]', err)
    return NextResponse.json({ success: false, message: 'Update failed' }, { status: 500 })
  }
}
