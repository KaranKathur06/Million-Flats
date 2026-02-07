import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'

const PatchSchema = z.object({
  title: z.string().trim().max(120).optional().nullable(),
  propertyType: z.string().trim().max(40).optional().nullable(),
  intent: z.enum(['SALE', 'RENT']).optional().nullable(),
  price: z.number().optional().nullable(),
  currency: z.string().trim().min(1).max(10).optional(),
  constructionStatus: z.enum(['READY', 'OFF_PLAN']).optional().nullable(),
  shortDescription: z.string().trim().max(1000).optional().nullable(),

  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  squareFeet: z.number().min(0).max(200000).optional(),

  countryCode: z.enum(['UAE', 'India']).optional(),
  city: z.string().trim().max(80).optional().nullable(),
  community: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),

  developerName: z.string().trim().max(120).optional().nullable(),

  amenities: z.array(z.string().trim().min(1).max(80)).max(80).optional().nullable(),
  customAmenities: z.array(z.string().trim().min(1).max(80)).max(5).optional().nullable(),

  paymentPlanText: z.string().trim().max(2000).optional().nullable(),
  emiNote: z.string().trim().max(500).optional().nullable(),

  authorizedToMarket: z.boolean().optional(),
  exclusiveDeal: z.boolean().optional(),
  ownerContactOnFile: z.boolean().optional(),

  duplicateScore: z.number().int().min(0).max(100).optional().nullable(),
  duplicateMatchedProjectId: z.string().trim().min(1).max(128).optional().nullable(),
  duplicateOverrideConfirmed: z.boolean().optional(),

  tour3dUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .refine((v) => {
      if (!v) return true
      try {
        const u = new URL(v)
        return u.protocol === 'http:' || u.protocol === 'https:'
      } catch {
        return false
      }
    }, 'Invalid URL'),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status })
    }

    const property = await (prisma as any).manualProperty.findFirst({
      where: { id: params.id, agentId: auth.agentId },
      include: { media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] } },
    })

    if (!property) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, property })
  } catch (error) {
    console.error('Manual property: failed to load draft', error)
    return NextResponse.json({ success: false, error: 'Failed to load draft' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status })
    }

    const body = await req.json().catch(() => null)
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 })
    }

    const existing = await (prisma as any).manualProperty.findFirst({ where: { id: params.id, agentId: auth.agentId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      return NextResponse.json({ success: false, error: 'Cannot edit after submission' }, { status: 400 })
    }

    const data: any = {
      ...parsed.data,
    }

    if (parsed.data.amenities !== undefined) data.amenities = parsed.data.amenities
    if (parsed.data.customAmenities !== undefined) data.customAmenities = parsed.data.customAmenities

    const updated = await (prisma as any).manualProperty.update({
      where: { id: params.id },
      data,
      include: { media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] } },
    })

    return NextResponse.json({ success: true, property: updated })
  } catch (error) {
    console.error('Manual property: failed to save draft', error)
    return NextResponse.json({ success: false, error: 'Failed to save draft' }, { status: 500 })
  }
}
