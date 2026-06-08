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

const updateSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).max(300).optional(),
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
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priorityOrder: z.number().int().min(0).optional(),
  metaTitle: z.string().max(300).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const partner = await (prisma as any).ecosystemPartner.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      services: { orderBy: { sortOrder: 'asc' } },
      locations: { orderBy: { sortOrder: 'asc' } },
      portfolios: { orderBy: { sortOrder: 'asc' } },
      reviews: { orderBy: { sortOrder: 'asc' } },
      faqs: { orderBy: { sortOrder: 'asc' } },
      gallery: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!partner) {
    return NextResponse.json({ success: false, message: 'Partner not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: partner })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const existing = await (prisma as any).ecosystemPartner.findUnique({
      where: { id: params.id },
      include: { category: { select: { slug: true } } },
    })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Partner not found' }, { status: 404 })
    }

    const body = await req.json()
    const data = updateSchema.parse(body)

    const updateData: Record<string, unknown> = { ...data }
    if (data.name && !data.slug) {
      updateData.slug = slugify(data.name)
    }
    if (data.slug) updateData.slug = data.slug.trim()

    const partner = await (prisma as any).ecosystemPartner.update({
      where: { id: params.id },
      data: updateData,
      include: { category: { select: { slug: true } } },
    })

    revalidatePath(`/ecosystem-partners/${existing.category.slug}`)
    if (partner.slug) {
      revalidatePath(`/partners/${partner.category.slug}/${partner.slug}`)
    }

    return NextResponse.json({ success: true, data: partner })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update partner'
    return NextResponse.json({ success: false, message: msg }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const partner = await (prisma as any).ecosystemPartner.update({
    where: { id: params.id },
    data: { isActive: false, status: 'REJECTED' },
    include: { category: { select: { slug: true } } },
  })

  revalidatePath(`/ecosystem-partners/${partner.category.slug}`)
  return NextResponse.json({ success: true })
}
