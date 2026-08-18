import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { getProjectListing } from '@/lib/services/ProjectListingService'
import { z } from 'zod'

const querySchema = z.object({
  countryIso2: z.string().length(2),
  cityName: z.string().min(1).max(100),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
})

/**
 * GET /api/admin/projects/listing-management
 * Returns projects within a city scope for admin reordering interface
 *
 * Query params:
 *   - countryIso2: ISO2 code (required, e.g., "AE")
 *   - cityName: City name (required, e.g., "Dubai")
 *   - page: Page number (default: 1)
 *   - pageSize: Results per page (default: 20, max: 100)
 *
 * Response:
 *   {
 *     success: true,
 *     result: {
 *       countryIso2: "AE",
 *       cityName: "Dubai",
 *       total: 42,
 *       page: 1,
 *       pageSize: 20,
 *       projects: [
 *         {
 *           id: "...",
 *           name: "...",
 *           slug: "...",
 *           listingPriority: 1,
 *           isPinned: false,
 *           pinPriority: null,
 *           isFeatured: false,
 *           createdAt: "...",
 *           developer: { id: "...", name: "..." }
 *         }
 *       ]
 *     }
 *   }
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
    const query = querySchema.parse({
      countryIso2: url.searchParams.get('countryIso2'),
      cityName: url.searchParams.get('cityName'),
      page: url.searchParams.get('page') || '1',
      pageSize: url.searchParams.get('pageSize') || '20',
    })

    const { countryIso2, cityName, page, pageSize } = query
    const skip = (page - 1) * pageSize

    // Get total count
    const total = await prisma.project.count({
      where: {
        countryIso2,
        city: cityName,
        status: 'PUBLISHED',
        isDeleted: false,
      },
    })

    // Get projects for this city in recommended order
    const projects = await getProjectListing({
      where: {
        countryIso2,
        city: cityName,
      },
      sortBy: 'recommended',
      take: pageSize,
      skip,
      include: {
        developer: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      result: {
        countryIso2,
        cityName,
        total,
        page,
        pageSize,
        projects: projects.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          listingPriority: p.listingPriority,
          isPinned: p.isPinned,
          pinPriority: p.pinPriority,
          isFeatured: p.isFeatured,
          createdAt: p.createdAt,
          developer: p.developer,
        })),
      },
    })
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: err.errors },
        { status: 400 }
      )
    }
    console.error('[GET /api/admin/projects/listing-management]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
