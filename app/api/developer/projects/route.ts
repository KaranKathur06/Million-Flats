import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getDeveloperProfile(userId: string) {
  return (prisma as any).developerProfile.findUnique({
    where: { userId },
    select: { id: true, onboardingStatus: true, linkedDeveloperId: true },
  })
}

function normalizeProjectCountry(value: unknown) {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (raw === 'AE' || raw === 'UAE') return 'UAE'
  if (raw === 'IN' || raw === 'INDIA') return 'INDIA'
  return 'UAE'
}

/**
 * GET /api/developer/projects
 * Lists all projects owned by the authenticated developer.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const role = (session.user as any)?.role
  if (role !== 'DEVELOPER' || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = await getDeveloperProfile(userId)
  if (!profile) return NextResponse.json({ error: 'Developer profile not found' }, { status: 404 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20'))

  const where: any = { ownedByProfileId: profile.id }
  if (status) where.status = status

  const [projects, total] = await Promise.all([
    (prisma as any).project.findMany({
      where,
      include: {
        _count: { select: { leads: true, projectUnitTypes: true } },
        developer: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    (prisma as any).project.count({ where }),
  ])

  return NextResponse.json({ projects, total, page, limit })
}

/**
 * POST /api/developer/projects
 * Creates a new project owned by this developer.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const role = (session.user as any)?.role
  if (role !== 'DEVELOPER' || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = await getDeveloperProfile(userId)
  if (!profile) return NextResponse.json({ error: 'Developer profile not found' }, { status: 404 })

  if (profile.onboardingStatus !== 'APPROVED') {
    return NextResponse.json({ error: 'Your account must be approved before creating projects.' }, { status: 403 })
  }

  const body = await req.json()

  // Required fields
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Project name is required' }, { status: 400 })

  // Auto-generate slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const existingSlug = await (prisma as any).project.findFirst({ where: { slug: baseSlug }, select: { id: true } })
  const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug

  const project = await (prisma as any).project.create({
    data: {
      name,
      slug,
      ownedByProfileId: profile.id,
      // Developer's linked developer record
      developerId: profile.linkedDeveloperId || undefined,
      status: 'DRAFT',

      // Optional fields from body
      description: body.description || null,
      city: body.city || null,
      locality: body.locality || null,
      country: normalizeProjectCountry(body.country),
      propertyType: body.propertyType || null,
      startPrice: body.startPrice ? parseFloat(body.startPrice) : null,
      maxPrice: body.maxPrice ? parseFloat(body.maxPrice) : null,
      currency: body.currency || 'AED',
      possessionDate: body.possessionDate ? new Date(body.possessionDate) : null,
      reraProjectNumber: body.reraProjectNumber || null,
      metaTitle: body.metaTitle || name,
      metaDescription: body.metaDescription || null,
    },
  })

  return NextResponse.json({ project }, { status: 201 })
}
