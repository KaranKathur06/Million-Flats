import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { slugifyPartnerName } from '@/lib/ecosystem/slugify'
import { applyApprovalDefaults } from '@/lib/ecosystem/partnerVisibility'
import { revalidatePartnerSurfaces } from '@/lib/ecosystem/revalidatePartner'
import { auditPartnerUpdate, auditPartnerGovernanceChange, detectGovernanceChanges } from '@/lib/ecosystem/admin/auditPartner'

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
  experienceDisplay: z.string().max(100).optional().nullable(),
  projectsCompleted: z.number().int().min(0).optional().nullable(),
  teamSize: z.number().int().min(0).optional().nullable(),
  partnerSince: z.number().int().min(1990).max(2100).optional().nullable(),
  locationCoverage: z.string().max(500).optional().nullable(),
  pricingRange: z.string().max(200).optional().nullable(),
  contactPerson: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  gstNumber: z.string().max(50).optional().nullable(),
  registrationNumber: z.string().max(100).optional().nullable(),
  categoryData: z.record(z.unknown()).optional().nullable(),
  whyChoose: z.array(z.object({ title: z.string(), description: z.string() })).optional().nullable(),
  workProcess: z.array(z.object({ step: z.number(), title: z.string(), description: z.string() })).optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priorityOrder: z.number().int().min(0).optional(),
  metaTitle: z.string().max(300).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().max(500).optional().nullable(),
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
      media: { orderBy: { type: 'asc' } },
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

    // Prevent category change on edit — category is locked after creation
    if (body.categoryId && body.categoryId !== existing.categoryId) {
      return NextResponse.json({
        success: false,
        message: 'Category cannot be changed after creation. Create a new partner instead.',
      }, { status: 400 })
    }

    const data = updateSchema.parse(body)

    // Remove categoryId from update payload — it's locked
    delete (data as any).categoryId

    const updateData: Record<string, unknown> = applyApprovalDefaults({ ...data })
    if (data.name && !data.slug) {
      updateData.slug = slugifyPartnerName(data.name)
    }
    if (data.slug) updateData.slug = data.slug.trim()

    const partner = await (prisma as any).ecosystemPartner.update({
      where: { id: params.id },
      data: updateData,
      include: { category: { select: { slug: true } } },
    })

    // Audit: general update
    const beforeSnap: Record<string, unknown> = {
      name: existing.name, status: existing.status, isVerified: existing.isVerified,
      isFeatured: existing.isFeatured, isActive: existing.isActive,
    }
    const afterSnap: Record<string, unknown> = {
      name: partner.name, status: partner.status, isVerified: partner.isVerified,
      isFeatured: partner.isFeatured, isActive: partner.isActive,
    }

    auditPartnerUpdate({
      partnerId: partner.id,
      adminUserId: auth.userId,
      beforeState: beforeSnap,
      afterState: afterSnap,
    }).catch(() => {})

    // Audit: specific governance changes
    const govChanges = detectGovernanceChanges(beforeSnap, afterSnap)
    for (const change of govChanges) {
      auditPartnerGovernanceChange({
        partnerId: partner.id,
        adminUserId: auth.userId,
        action: change.action,
        beforeState: { [change.field]: change.from },
        afterState: { [change.field]: change.to },
      }).catch(() => {})
    }

    revalidatePartnerSurfaces(partner.category.slug, partner.slug)
    if (existing.category.slug !== partner.category.slug) {
      revalidatePartnerSurfaces(existing.category.slug, existing.slug)
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

  revalidatePartnerSurfaces(partner.category.slug, partner.slug)
  return NextResponse.json({ success: true })
}
