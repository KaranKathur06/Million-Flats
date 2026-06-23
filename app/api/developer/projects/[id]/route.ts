import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getOwnedProject(userId: string, projectId: string) {
  const profile = await (prisma as any).developerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) return null
  const project = await (prisma as any).project.findFirst({
    where: { id: projectId, ownedByProfileId: profile.id },
  })
  return project
}

/** GET /api/developer/projects/[id] */
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if ((session.user as any)?.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const project = await (prisma as any).project.findFirst({
    where: {
      id: params.id,
      ownedByProfile: { userId },
    },
    include: {
      projectUnitTypes: { include: { variants: true } },
      media: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { leads: true } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  return NextResponse.json({ project })
}

/** PATCH /api/developer/projects/[id] */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if ((session.user as any)?.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const project = await getOwnedProject(userId, params.id)
  if (!project) return NextResponse.json({ error: 'Project not found or not owned by you' }, { status: 404 })

  const body = await req.json()
  const ALLOWED = [
    'name', 'description', 'city', 'locality', 'country', 'propertyType',
    'startPrice', 'maxPrice', 'currency', 'possessionDate',
    'reraProjectNumber', 'metaTitle', 'metaDescription', 'metaKeywords',
    'bannerUrl', 'thumbnailUrl', 'videoUrl', 'brochureUrl',
    'amenities', 'configurations', 'totalUnits',
  ]

  const data: Record<string, unknown> = {}
  for (const k of ALLOWED) {
    if (k in body) data[k] = body[k]
  }

  // Convert price fields
  if ('startPrice' in data && data.startPrice) data.startPrice = parseFloat(data.startPrice as string)
  if ('maxPrice' in data && data.maxPrice) data.maxPrice = parseFloat(data.maxPrice as string)
  if ('possessionDate' in data && data.possessionDate) data.possessionDate = new Date(data.possessionDate as string)

  // Handle publish action
  if (body._action === 'PUBLISH') {
    data.status = 'UNDER_REVIEW' // Goes to admin review first
  } else if (body._action === 'UNPUBLISH') {
    data.status = 'DRAFT'
  } else if (body._action === 'ARCHIVE') {
    data.status = 'ARCHIVED'
  }

  const updated = await (prisma as any).project.update({ where: { id: params.id }, data })

  return NextResponse.json({ project: updated })
}

/** DELETE /api/developer/projects/[id] — soft delete */
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if ((session.user as any)?.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const project = await getOwnedProject(userId, params.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Only allow deletion of DRAFT projects
  if (project.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only draft projects can be deleted.' }, { status: 400 })
  }

  await (prisma as any).project.update({
    where: { id: params.id },
    data: { isDeleted: true, deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
