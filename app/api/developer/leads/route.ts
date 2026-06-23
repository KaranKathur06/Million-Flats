import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/developer/leads
 * Returns leads for this developer's profile with CRM stage filter/pagination.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if ((session.user as any)?.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = await (prisma as any).developerProfile.findUnique({
    where: { userId }, select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const url = new URL(req.url)
  const stage = url.searchParams.get('stage') || undefined
  const leadType = url.searchParams.get('type') || undefined
  const projectId = url.searchParams.get('projectId') || undefined
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '25'))

  const where: any = { developerProfileId: profile.id }
  if (stage) where.crmStage = stage
  if (leadType) where.leadType = leadType
  if (projectId) where.projectId = projectId

  const [leads, total] = await Promise.all([
    (prisma as any).lead.findMany({
      where,
      include: { project: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    (prisma as any).lead.count({ where }),
  ])

  return NextResponse.json({ leads, total, page, limit })
}

/**
 * PATCH /api/developer/leads
 * Bulk-update CRM stage for one or more leads.
 * Body: { ids: string[], crmStage: string }
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if ((session.user as any)?.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = await (prisma as any).developerProfile.findUnique({
    where: { userId }, select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await req.json()
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
  const crmStage = typeof body?.crmStage === 'string' ? body.crmStage : null

  const VALID_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'BOOKED', 'CLOSED', 'LOST']
  if (!crmStage || !VALID_STAGES.includes(crmStage)) {
    return NextResponse.json({ error: 'Invalid crmStage' }, { status: 400 })
  }
  if (!ids.length) return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })

  // Only update leads that belong to this developer
  const { count } = await (prisma as any).lead.updateMany({
    where: { id: { in: ids }, developerProfileId: profile.id },
    data: { crmStage },
  })

  return NextResponse.json({ updated: count })
}
