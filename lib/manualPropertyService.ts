import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { ManualPropertyStatusValue } from '@/lib/manualPropertyLifecycle'

export interface ManualPropertyCreateInput {
  agentId: string
  developerId?: string | null
  sourceProvider?: string | null
  sourceUrl?: string | null
  sourceListingId?: string | null
  title: string
  propertyType?: string | null
  intent?: 'SALE' | 'RENT' | null
  price?: number | null
  currency?: string | null
  constructionStatus?: 'READY' | 'OFF_PLAN' | null
  shortDescription?: string | null
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  countryCode?: 'UAE' | 'INDIA'
  countryIso2?: string | null
  city?: string | null
  community?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  developerName?: string | null
  amenities?: unknown
  customAmenities?: unknown
  paymentPlan?: unknown
  paymentPlanText?: string | null
  emiNote?: string | null
  authorizedToMarket?: boolean
  exclusiveDeal?: boolean
  ownerContactOnFile?: boolean
  tour3dUrl?: string | null
  status?: ManualPropertyStatusValue
}

export interface ManualPropertyCreateContext {
  db?: Prisma.TransactionClient
}

export interface ManualPropertyCreateResult {
  property: any
  affectedPaths: string[]
}

/**
 * Canonical domain boundary for creating ManualProperty records.
 * Import, admin, and future ingestion paths must provide an existing Agent ID.
 */
export async function createManualProperty(
  input: ManualPropertyCreateInput,
  context: ManualPropertyCreateContext = {},
): Promise<ManualPropertyCreateResult> {
  const agentId = String(input.agentId || '').trim()
  const title = String(input.title || '').trim()

  if (!agentId) throw new Error('A valid Agent owner is required.')
  if (!title) throw new Error('A property title is required.')

  const db = context.db || prisma
  const agent = await (db as any).agent.findUnique({
    where: { id: agentId },
    select: { id: true },
  })
  if (!agent) throw new Error('The selected Agent owner does not exist.')

  const property = await (db as any).manualProperty.create({
    data: {
      agentId,
      developerId: input.developerId || null,
      sourceType: 'MANUAL',
      sourceProvider: input.sourceProvider || null,
      sourceUrl: input.sourceUrl || null,
      sourceListingId: input.sourceListingId || null,
      status: input.status || 'DRAFT',
      title,
      propertyType: input.propertyType || null,
      intent: input.intent || null,
      price: input.price ?? null,
      currency: input.currency || undefined,
      constructionStatus: input.constructionStatus || null,
      shortDescription: input.shortDescription || null,
      bedrooms: input.bedrooms ?? 0,
      bathrooms: input.bathrooms ?? 0,
      squareFeet: input.squareFeet ?? 0,
      countryCode: input.countryCode || 'INDIA',
      countryIso2: input.countryIso2 || null,
      city: input.city || null,
      community: input.community || null,
      address: input.address || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      developerName: input.developerName || null,
      amenities: input.amenities ?? null,
      customAmenities: input.customAmenities ?? null,
      paymentPlan: input.paymentPlan ?? null,
      paymentPlanText: input.paymentPlanText || null,
      emiNote: input.emiNote || null,
      authorizedToMarket: input.authorizedToMarket ?? false,
      exclusiveDeal: input.exclusiveDeal ?? false,
      ownerContactOnFile: input.ownerContactOnFile ?? false,
      tour3dUrl: input.tour3dUrl || null,
      submittedAt: null,
    },
  })

  return {
    property,
    affectedPaths: ['/buy', '/rent', '/properties', '/admin/properties', '/agents'],
  }
}
