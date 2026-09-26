import type { LeadCountry, LeadType } from '@prisma/client'
import { displayCategory, LEAD_TYPE_LABELS, statusesForLeadType } from '@/lib/leads/constants'
import { budgetRangeLabel, timelineLabel } from '@/lib/leads/threeDTour'

function safeString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function metaRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  return metadata as Record<string, unknown>
}

function metaString(metadata: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!metadata) return null
  for (const key of keys) {
    const v = metadata[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function ecosystemPartnerName(
  lead: {
    projectOrCompany?: string | null
    sourceName?: string | null
    name: string
    metadata?: unknown
  },
): string | null {
  const meta = metaRecord(lead.metadata)
  const company = meta?.companyDetails
  if (company && typeof company === 'object' && !Array.isArray(company)) {
    const c = company as Record<string, unknown>
    const fromCompany =
      safeString(c.legalCompanyName) ||
      safeString(c.fullLegalName) ||
      safeString(c.businessName) ||
      safeString(c.legalBusinessName)
    if (fromCompany) return fromCompany
  }
  return lead.projectOrCompany?.trim() || lead.sourceName?.trim() || null
}

export type LeadForDisplay = {
  id: string
  leadType: LeadType
  leadTypeLabel: string
  category: string | null
  categoryLabel: string
  partnerCategory: string | null
  partnerName: string | null
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  country: LeadCountry
  message: string | null
  sourcePage: string | null
  sourceName: string | null
  createdAt: string
  updatedAt: string
  assignedTo: string | null
  status: string
  notes: string | null
  projectOrCompany: string | null
  propertyType: string | null
  propertyName: string | null
  propertySize: string | null
  budgetRange: string | null
  budgetRangeLabel: string | null
  timeline: string | null
  timelineLabel: string | null
  referralCode: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  referrer: string | null
  landingUrl: string | null
  metadata: Record<string, unknown> | null
  allowedStatuses: readonly string[]
  project: { id: string; name: string; slug: string } | null
  ecosystemPartner: { id: string; name: string; status: string } | null
  developerId: string | null
  priority: string
  leadSubType: string | null
  sourceType: string | null
  sourceUrl: string | null
  propertyId: string | null
  agentId: string | null
  displayPriceAtInquiry: number | null
  basePriceAtInquiry: number | null
  baseCurrencyAtInquiry: string | null
  displayCurrencyAtInquiry: string | null
  activities: Array<{ id: string; type: string; summary: string; createdAt: Date | string }>
  notesHistory: Array<{ id: string; authorId: string | null; text: string; createdAt: Date | string }>
  followUps: Array<{ id: string; action: string; scheduledAt: Date | string; assignedTo: string | null; notes: string | null; completedAt: Date | string | null }>
  property: { id: string; title: string | null; slug: string | null } | null
  agent: { id: string; name: string | null; status: string } | null
}

type RawLead = {
  id: string
  leadType: LeadType
  category: string | null
  name: string
  email: string
  phone: string | null
  whatsapp?: string | null
  message?: string | null
  projectOrCompany?: string | null
  sourceName?: string | null
  country: LeadCountry
  status: string
  assignedTo: string | null
  createdAt: Date | string
  updatedAt: Date | string
  propertyType?: string | null
  propertyName?: string | null
  propertySize?: string | null
  budgetRange?: string | null
  timeline?: string | null
  referralCode?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
  referrer?: string | null
  landingUrl?: string | null
  metadata?: unknown
  developerId?: string | null
  project?: { id: string; name: string; slug: string } | null
  ecosystemPartner?: { id: string; name: string; status: string } | null
  priority?: string | null
  leadSubType?: string | null
  sourceType?: string | null
  sourceUrl?: string | null
  propertyId?: string | null
  agentId?: string | null
  displayPriceAtInquiry?: number | null
  basePriceAtInquiry?: number | null
  baseCurrencyAtInquiry?: string | null
  displayCurrencyAtInquiry?: string | null
  activities?: Array<{ id: string; type: string; summary: string; createdAt: Date | string }>
  notes?: Array<{ id: string; authorId: string | null; text: string; createdAt: Date | string }>
  followUps?: Array<{ id: string; action: string; scheduledAt: Date | string; assignedTo: string | null; notes: string | null; completedAt: Date | string | null }>
  property?: { id: string; title: string | null; slug?: string | null } | null
  agent?: { id: string; status: string; user?: { name: string | null } | null } | null
}

function toIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : String(d)
}

/** Normalize a raw lead record into a safe, drawer-friendly display model for every lead type. */
export function mapLeadForDisplay(lead: RawLead): LeadForDisplay {
  const meta = metaRecord(lead.metadata)
  const categoryLabel = displayCategory(lead.leadType, lead.category)
  const partnerName = lead.leadType === 'ECOSYSTEM' ? ecosystemPartnerName(lead) : lead.projectOrCompany || lead.sourceName || null

  const notes =
    metaString(meta, 'notes', 'adminNotes', 'internalNotes') ||
    (lead.leadType === 'ECOSYSTEM' ? metaString(meta, 'businessIntent') : null)

  const sourcePage =
    safeString(lead.landingUrl) ||
    safeString(lead.referrer) ||
    metaString(meta, 'sourcePage', 'sourceUrl') ||
    null

  return {
    id: lead.id,
    leadType: lead.leadType,
    leadTypeLabel: LEAD_TYPE_LABELS[lead.leadType] || lead.leadType,
    category: lead.category,
    categoryLabel,
    partnerCategory: lead.leadType === 'ECOSYSTEM' ? categoryLabel : null,
    partnerName,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    whatsapp: lead.whatsapp ?? null,
    country: lead.country,
    message: lead.message ?? null,
    sourcePage,
    sourceName: lead.sourceName ?? null,
    createdAt: toIso(lead.createdAt),
    updatedAt: toIso(lead.updatedAt),
    assignedTo: lead.assignedTo,
    status: lead.status,
    notes,
    projectOrCompany: lead.projectOrCompany ?? null,
    propertyType: lead.propertyType ?? null,
    propertyName: lead.propertyName ?? null,
    propertySize: lead.propertySize ?? null,
    budgetRange: lead.budgetRange ?? null,
    budgetRangeLabel: budgetRangeLabel(lead.budgetRange) || null,
    timeline: lead.timeline ?? null,
    timelineLabel: timelineLabel(lead.timeline) || null,
    referralCode: lead.referralCode ?? null,
    utmSource: lead.utmSource ?? null,
    utmMedium: lead.utmMedium ?? null,
    utmCampaign: lead.utmCampaign ?? null,
    utmTerm: lead.utmTerm ?? null,
    utmContent: lead.utmContent ?? null,
    referrer: lead.referrer ?? null,
    landingUrl: lead.landingUrl ?? null,
    metadata: meta,
    allowedStatuses: statusesForLeadType(lead.leadType),
    project: lead.project ?? null,
    ecosystemPartner: lead.ecosystemPartner ?? null,
    developerId: lead.developerId ?? null,
    priority: lead.priority || 'MEDIUM',
    leadSubType: lead.leadSubType ?? null,
    sourceType: lead.sourceType ?? null,
    sourceUrl: lead.sourceUrl ?? null,
    propertyId: lead.propertyId ?? null,
    agentId: lead.agentId ?? null,
    displayPriceAtInquiry: lead.displayPriceAtInquiry ?? null,
    basePriceAtInquiry: lead.basePriceAtInquiry ?? null,
    baseCurrencyAtInquiry: lead.baseCurrencyAtInquiry ?? null,
    displayCurrencyAtInquiry: lead.displayCurrencyAtInquiry ?? null,
    activities: (lead.activities || []).map((activity) => ({ ...activity, createdAt: toIso(activity.createdAt) })),
    notesHistory: (lead.notes || []).map((note) => ({ ...note, createdAt: toIso(note.createdAt) })),
    followUps: (lead.followUps || []).map((followUp) => ({
      ...followUp,
      scheduledAt: toIso(followUp.scheduledAt),
      completedAt: followUp.completedAt ? toIso(followUp.completedAt) : null,
    })),
    property: lead.property ? { ...lead.property, slug: lead.property.slug ?? null } : null,
    agent: lead.agent ? { id: lead.agent.id, name: lead.agent.user?.name ?? null, status: lead.agent.status } : null,
  }
}
