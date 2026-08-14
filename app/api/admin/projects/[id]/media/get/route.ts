import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/admin/projects/[id]/media
 *
 * Fetch all media for a project with category counts.
 *
 * Query params:
 * - category?: string (filter by category)
 * - sortBy?: "name"|"date" (default: "date")
 * - sortOrder?: "asc"|"desc" (default: "desc")
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const categoryFilter = searchParams.get('category')?.toLowerCase() || null
    const sortBy = (searchParams.get('sortBy') || 'date') as 'name' | 'date'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    // Verify project exists
    const project = await (prisma as any).project.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch all media for this project
    const allMedia = await (prisma as any).projectMedia.findMany({
      where: { projectId: params.id },
      select: {
        id: true,
        mediaUrl: true,
        mediaType: true,
        category: true,
        label: true,
        sortOrder: true,
        s3Key: true,
        createdAt: true,
      },
      orderBy: sortBy === 'name' ? { label: { sort: sortOrder } } : { createdAt: { sort: sortOrder } },
    })

    // Build category counts
    const counts = {
      total: allMedia.length,
      hero: allMedia.filter((m: any) => m.category === 'HERO').length,
      interior: allMedia.filter((m: any) => m.category === 'INTERIOR').length,
      exterior: allMedia.filter((m: any) => m.category === 'EXTERIOR').length,
      amenities: allMedia.filter((m: any) => m.category === 'AMENITIES').length,
      lifestyle: allMedia.filter((m: any) => m.category === 'LIFESTYLE').length,
      floor_plan: allMedia.filter((m: any) => m.category === 'FLOOR_PLAN').length,
    }

    // Filter by category if specified
    let filtered = allMedia
    if (categoryFilter) {
      const categoryEnum =
        categoryFilter === 'floor_plan' || categoryFilter === 'floor-plan'
          ? 'FLOOR_PLAN'
          : categoryFilter.toUpperCase()
      filtered = allMedia.filter((m: any) => m.category === categoryEnum)
    }

    return NextResponse.json({
      success: true,
      media: filtered.map((m: any) => ({
        id: m.id,
        mediaUrl: m.mediaUrl,
        category: m.category?.toLowerCase() || m.mediaType,
        label: m.label,
        sortOrder: m.sortOrder,
        s3Key: m.s3Key,
        createdAt: m.createdAt,
      })),
      counts,
    })
  } catch (err: any) {
    console.error('[GET /api/admin/projects/[id]/media]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}
