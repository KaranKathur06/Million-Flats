import type { LeadCountry, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createLead } from '@/lib/leads/createLead'
import { triggerAgentVerification } from '@/lib/verification/verificationPolicy'

export type PropertyInquiryInput = {
  propertyId: string
  name: string
  email: string
  phone?: string | null
  country?: LeadCountry
  city?: string | null
  inquiryType?: string | null
  preferredContactMethod?: string | null
  preferredContactTime?: string | null
  budget?: string | null
  financingRequired?: boolean | null
  purchaseTimeline?: string | null
  siteVisitRequired?: boolean | null
  message?: string | null
  displayCurrency?: string | null
  sourceUrl?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  referrer?: string | null
  userId?: string | null
}

function normalizePhone(value: string | null | undefined) {
  const phone = String(value || '').trim()
  return phone ? phone.replace(/[\s().-]+/g, '') : null
}

export async function createPropertyInquiry(input: PropertyInquiryInput) {
  const email = input.email.trim().toLowerCase()
  const phone = normalizePhone(input.phone)
  const property = await prisma.manualProperty.findUnique({
    where: { id: input.propertyId },
    select: {
      id: true,
      title: true,
      propertyType: true,
      intent: true,
      bedrooms: true,
      squareFeet: true,
      price: true,
      currency: true,
      city: true,
      region: true,
      community: true,
      locality: true,
      agentId: true,
      developerId: true,
      developer: { select: { id: true, name: true } },
      agent: { select: { id: true, status: true } },
    },
  })

  if (!property) throw new Error('Property not found')

  const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const duplicate = await prisma.lead.findFirst({
    where: {
      propertyId: property.id,
      email,
      createdAt: { gte: recentSince },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true },
  })

  if (duplicate) return { duplicate: true as const, lead: duplicate }

  const basePrice = property.price && property.price > 0 ? property.price : null
  const baseCurrency = String(property.currency || 'AED').toUpperCase()
  const metadata: Prisma.InputJsonObject = {
    city: input.city?.trim() || null,
    inquiryType: input.inquiryType?.trim() || 'PROPERTY_INQUIRY',
    preferredContactMethod: input.preferredContactMethod?.trim() || null,
    preferredContactTime: input.preferredContactTime?.trim() || null,
    financingRequired: input.financingRequired ?? null,
    siteVisitRequired: input.siteVisitRequired ?? null,
    propertySnapshot: {
      title: property.title || 'Property inquiry',
      propertyType: property.propertyType,
      intent: property.intent,
      bedrooms: property.bedrooms,
      squareFeet: property.squareFeet,
      location: [property.locality, property.community, property.city, property.region].filter(Boolean).join(', '),
      developerId: property.developer?.id || property.developerId,
      developerName: property.developer?.name || null,
    },
  }

  const lead = await prisma.$transaction(async (db) => {
    const created = await createLead({
      db,
      leadType: 'CONTACT',
      category: 'PROPERTY_INQUIRY',
      leadSubType: 'PROPERTY_INQUIRY',
      name: input.name,
      email,
      phone,
      message: input.message,
      country: input.country || 'INDIA',
      propertyId: property.id,
      agentId: property.agentId,
      developerId: property.developerId,
      sourceName: 'Property Contact Form',
      sourceType: 'PROPERTY_CONTACT_FORM',
      sourceUrl: input.sourceUrl,
      propertyName: property.title,
      propertyType: property.propertyType,
      propertySize: property.squareFeet ? `${property.squareFeet} sq.ft.` : null,
      budgetRange: input.budget,
      timeline: input.purchaseTimeline,
      userId: input.userId,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
      referrer: input.referrer,
      metadata,
      basePriceAtInquiry: basePrice,
      baseCurrencyAtInquiry: baseCurrency,
      displayPriceAtInquiry: basePrice,
      displayCurrencyAtInquiry: input.displayCurrency || baseCurrency,
      notify: true,
    } as Parameters<typeof createLead>[0])

    await db.leadActivity.create({
      data: {
        leadId: created.id,
        type: 'CREATED',
        summary: 'Property inquiry submitted',
        metadata: { propertyId: property.id, agentId: property.agentId },
      },
    })

    if (property.agentId) {
      const verification = await triggerAgentVerification(db, property.agentId)
      await db.leadActivity.create({
        data: {
          leadId: created.id,
          type: 'DOCUMENTS_REQUESTED',
          summary: 'Progressive agent verification triggered',
          metadata: { agentId: property.agentId, verificationStatus: verification.verificationStatus },
        },
      })
    }

    return created
  })

  return { duplicate: false as const, lead, agentId: property.agentId }
}