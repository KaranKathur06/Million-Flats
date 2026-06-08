import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

const partnerSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(300),
  slug: z.string().max(200).optional().nullable(),
  tagline: z.string().max(500).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  logo: z.string().max(2000).optional().nullable(),
  coverImage: z.string().max(2000).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  yearsExperience: z.number().int().min(0).optional().nullable(),
  projectsCompleted: z.number().int().min(0).optional().nullable(),
  teamSize: z.number().int().min(0).optional().nullable(),
  partnerSince: z.number().int().min(1990).max(2100).optional().nullable(),
  locationCoverage: z.string().max(500).optional().nullable(),
  pricingRange: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priorityOrder: z.number().int().min(0).optional(),
  metaTitle: z.string().max(300).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
})

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search')?.trim() || undefined

    const where: Record<string, unknown> = {}
    if (categoryId) where.categoryId = categoryId
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    const partners = await (prisma as any).ecosystemPartner.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { priorityOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        category: { select: { slug: true, title: true } },
        _count: { select: { portfolios: true, reviews: true, leads: true } },
      },
      take: 200,
    })

    return NextResponse.json({ success: true, data: partners })
  } catch (e) {
    console.error('Admin ecosystem partners list error:', e)
    return NextResponse.json({ success: false, message: 'Failed to load partners' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const data = partnerSchema.parse(body)
    const slug = (data.slug?.trim() || slugify(data.name)) || slugify(data.name)

    const partner = await (prisma as any).ecosystemPartner.create({
      data: {
        categoryId: data.categoryId,
        name: data.name.trim(),
        slug,
        tagline: data.tagline?.trim() || null,
        shortDescription: data.shortDescription?.trim() || null,
        description: data.description?.trim() || null,
        logo: data.logo || null,
        coverImage: data.coverImage || null,
        rating: data.rating ?? null,
        yearsExperience: data.yearsExperience ?? null,
        projectsCompleted: data.projectsCompleted ?? null,
        teamSize: data.teamSize ?? null,
        partnerSince: data.partnerSince ?? null,
        locationCoverage: data.locationCoverage?.trim() || null,
        pricingRange: data.pricingRange?.trim() || null,
        contactEmail: data.contactEmail?.trim() || `${slug}@partners.millionflats.local`,
        status: data.status || 'PENDING',
        isFeatured: data.isFeatured ?? false,
        isVerified: data.isVerified ?? false,
        isActive: data.isActive ?? true,
        priorityOrder: data.priorityOrder ?? 0,
        metaTitle: data.metaTitle?.trim() || null,
        metaDescription: data.metaDescription?.trim() || null,
      },
      include: { category: { select: { slug: true } } },
    })

    revalidatePath(`/ecosystem-partners/${partner.category.slug}`)
    if (partner.slug) {
      revalidatePath(`/partners/${partner.category.slug}/${partner.slug}`)
    }
    return NextResponse.json({ success: true, data: partner })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create partner'
    return NextResponse.json({ success: false, message: msg }, { status: 400 })
  }
}
