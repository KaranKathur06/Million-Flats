import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentDraftSession } from '@/lib/agentAuth'
import { countryIso2ForCountry } from '@/lib/manualPropertyForm'

const PaymentPlanStageSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  percentage: z.number().finite().gt(0).max(100),
  description: z.string().trim().max(300).optional(),
  order: z.number().int().min(0).max(1000),
})

function errorToDetails(error: unknown) {
  if (!error || typeof error !== 'object') return null
  const anyErr = error as any
  return {
    name: typeof anyErr.name === 'string' ? anyErr.name : undefined,
    message: typeof anyErr.message === 'string' ? anyErr.message : undefined,
    code: typeof anyErr.code === 'string' ? anyErr.code : undefined,
    meta: anyErr.meta,
  }
}

function classifyDraftSaveError(error: unknown) {
  const details = errorToDetails(error)
  const msg = String((details as any)?.message || '')
  const looksLikeMissingTable = /manual_properties/i.test(msg) && /(does not exist|relation .* does not exist|undefined_table|42P01)/i.test(msg)
  if (looksLikeMissingTable) {
    return {
      status: 500,
      error: 'Manual listings database tables are missing. Run Prisma migrations (prisma migrate deploy).',
      code: 'DB_MISSING_TABLE',
      details,
    }
  }

  return {
    status: 500,
    error: 'Failed to save draft',
    code: 'DRAFT_SAVE_FAILED',
    details,
  }
}

const PatchSchema = z.object({
  title: z.string().trim().max(120).optional().nullable(),
  category: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'LAND']).optional().nullable(),
  propertyType: z.string().trim().max(40).optional().nullable(),
  intent: z.enum(['SALE', 'RENT']).optional().nullable(),
  price: z.number().optional().nullable(),
  currency: z.string().trim().min(1).max(10).optional(),
  negotiable: z.boolean().optional().nullable(),
  bookingAmount: z.number().min(0).optional().nullable(),
  maintenanceCharges: z.number().min(0).optional().nullable(),
  otherCharges: z.number().min(0).optional().nullable(),
  annualRent: z.number().min(0).optional().nullable(),
  securityDeposit: z.number().min(0).optional().nullable(),
  agencyFee: z.number().min(0).optional().nullable(),
  utilitiesIncluded: z.boolean().optional().nullable(),
  availableFrom: z.coerce.date().optional().nullable(),
  leaseDurationMonths: z.number().int().min(1).max(120).optional().nullable(),
  paymentFrequency: z.string().trim().max(30).optional().nullable(),
  preferredTenantType: z.string().trim().max(60).optional().nullable(),
  petFriendly: z.boolean().optional().nullable(),
  carpetArea: z.number().min(0).optional().nullable(),
  plotArea: z.number().min(0).optional().nullable(),
  balconyCount: z.number().int().min(0).max(50).optional().nullable(),
  parkingSpaces: z.number().int().min(0).max(100).optional().nullable(),
  propertyAgeYears: z.number().int().min(0).max(200).optional().nullable(),
  floorNumber: z.number().int().min(0).max(300).optional().nullable(),
  totalFloors: z.number().int().min(0).max(300).optional().nullable(),
  facing: z.string().trim().max(30).optional().nullable(),
  view: z.string().trim().max(60).optional().nullable(),
  furnishingStatus: z.string().trim().max(40).optional().nullable(),
  propertyCondition: z.string().trim().max(40).optional().nullable(),
  possessionDate: z.coerce.date().optional().nullable(),
  constructionStatus: z.enum(['READY', 'OFF_PLAN']).optional().nullable(),
  shortDescription: z.string().trim().max(1000).optional().nullable(),

  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  squareFeet: z.number().min(0).max(200000).optional(),

  countryCode: z.enum(['UAE', 'India']).optional(),
  countryIso2: z.enum(['AE', 'IN']).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  community: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(100).optional().nullable(),
  locality: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  locationPrecision: z.enum(['EXACT', 'APPROXIMATE']).optional().nullable(),
  publicLocationVisible: z.boolean().optional().nullable(),

  developerName: z.string().trim().max(120).optional().nullable(),

  amenities: z.array(z.string().trim().min(1).max(80)).max(80).optional().nullable(),
  customAmenities: z.array(z.string().trim().min(1).max(80)).max(5).optional().nullable(),

  paymentPlan: z.array(PaymentPlanStageSchema).max(50).optional().nullable(),
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

  lastCompletedStep: z.string().trim().min(1).max(40).optional().nullable(),
  clonedFromId: z.string().trim().min(1).max(128).optional().nullable(),
  archivedAt: z.coerce.date().optional().nullable(),
  archivedBy: z.string().trim().min(1).max(40).optional().nullable(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentDraftSession()
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
    const details = errorToDetails(error)
    return NextResponse.json({ success: false, error: 'Failed to load draft', code: 'DRAFT_LOAD_FAILED', details }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentDraftSession()
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

    if (parsed.data.countryCode) data.countryIso2 = countryIso2ForCountry(parsed.data.countryCode)

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
    const info = classifyDraftSaveError(error)
    return NextResponse.json({ success: false, error: info.error, code: info.code, details: info.details }, { status: info.status })
  }
}
