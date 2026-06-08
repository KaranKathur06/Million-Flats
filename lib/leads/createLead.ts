import type { LeadCountry, LeadType, Prisma } from '@prisma/client'
import type { LeadEcosystemCategory } from '@/lib/leads/types'
import { prisma } from '@/lib/prisma'
import { notifyAdminNewLead } from '@/lib/leads/notifications'
import { displayCategory } from '@/lib/leads/constants'
import { ecosystemCategoryToSlug, normalizeEcosystemCategory } from '@/lib/leads/types'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export type CreateLeadInput = {
  leadType: LeadType
  name: string
  email: string
  phone?: string | null
  whatsapp?: string | null
  message?: string | null
  /** Ecosystem: enum code; Contact: inquiry code; 3D Tour: inquiry type; Project: optional display name */
  category?: string | null
  sourceId?: string | null
  sourceName?: string | null
  projectOrCompany?: string | null
  country?: LeadCountry
  status?: string
  projectId?: string | null
  assignedTo?: string | null
  userId?: string | null
  propertyType?: string | null
  propertyName?: string | null
  propertySize?: string | null
  budgetRange?: string | null
  timeline?: string | null
  referralCode?: string | null
  referralPartnerId?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
  referrer?: string | null
  landingUrl?: string | null
  metadata?: Prisma.InputJsonValue
  legacyTable?: string | null
  legacyId?: string | null
  notify?: boolean
}

function defaultStatus(leadType: LeadType) {
  if (leadType === 'ECOSYSTEM') return 'APPLIED'
  if (leadType === 'THREE_D_TOUR') return 'NEW_INQUIRY'
  return 'NEW'
}

function resolveCategory(leadType: LeadType, category: string | null | undefined) {
  if (!category) return null
  if (leadType === 'ECOSYSTEM') {
    return normalizeEcosystemCategory(category) || category
  }
  return category
}

export async function createLead(input: CreateLeadInput) {
  const email = input.email.trim().toLowerCase()
  const category = resolveCategory(input.leadType, input.category)
  const sourceName = input.sourceName?.trim() || input.projectOrCompany?.trim() || null

  const metadata =
    input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? {
          ...(input.metadata as object),
          ...(input.leadType === 'ECOSYSTEM' && category
            ? {
                categorySlug: ecosystemCategoryToSlug(category as LeadEcosystemCategory),
                ecosystemCategory: category,
              }
            : {}),
        }
      : input.metadata

  const data: Prisma.LeadCreateInput = {
    leadType: input.leadType,
    name: input.name.trim(),
    email,
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    message: input.message?.trim() || null,
    category,
    sourceId: input.sourceId || null,
    sourceName,
    projectOrCompany: input.projectOrCompany?.trim() || sourceName,
    country: input.country || 'INDIA',
    status: input.status || defaultStatus(input.leadType),
    assignedTo: input.assignedTo || null,
    utmSource: input.utmSource || null,
    utmMedium: input.utmMedium || null,
    utmCampaign: input.utmCampaign || null,
    utmTerm: input.utmTerm || null,
    utmContent: input.utmContent || null,
    referrer: input.referrer || null,
    landingUrl: input.landingUrl || null,
    metadata,
    legacyTable: input.legacyTable || null,
    legacyId: input.legacyId || null,
    userId: input.userId || null,
    propertyType: input.propertyType || null,
    propertyName: input.propertyName || null,
    propertySize: input.propertySize || null,
    budgetRange: input.budgetRange || null,
    timeline: input.timeline || null,
    referralCode: input.referralCode || null,
    referralPartnerId: input.referralPartnerId || null,
    ...(input.projectId ? { project: { connect: { id: input.projectId } } } : {}),
  }

  const lead = await prisma.lead.create({
    data,
    select: { id: true, leadType: true, status: true, category: true, createdAt: true },
  })

  if (input.notify !== false) {
    await notifyAdminNewLead({
      leadType: input.leadType,
      leadId: lead.id,
      name: input.name,
      email,
      phone: input.phone,
      category: category || undefined,
      projectOrCompany: sourceName,
      message: input.message,
      propertyName: input.propertyName,
      budgetRange: input.budgetRange,
      timeline: input.timeline,
    }).catch(() => null)
  }

  return lead
}

export function contactSubjectToCategory(subject: string): string {
  const s = subject.toLowerCase()
  if (s === 'property') return 'PROPERTY_INQUIRY'
  if (s === 'agent_inquiry') return 'AGENT_INQUIRY'
  return 'GENERAL_INQUIRY'
}

export function ecosystemSlugToCategory(slug: string): LeadEcosystemCategory | '' {
  return normalizeEcosystemCategory(slug)
}
