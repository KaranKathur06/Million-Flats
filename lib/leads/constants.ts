import type { LeadCountry, LeadType } from '@prisma/client'
import type { LeadEcosystemCategory } from '@/lib/leads/types'
import { inquiryTypeLabel, THREE_D_TOUR_STATUSES } from '@/lib/leads/threeDTour'

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  THREE_D_TOUR: '3D Tour Inquiry',
  PROJECT: 'Project Lead',
  CONTACT: 'Contact Lead',
  ECOSYSTEM: 'Ecosystem Lead',
  DEVELOPER: 'Developer Inquiry',
}

export const LEAD_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Leads' },
  { value: 'THREE_D_TOUR', label: '3D Tour Inquiry' },
  { value: 'PROJECT', label: 'Project Lead' },
  { value: 'CONTACT', label: 'Contact Lead' },
  { value: 'ECOSYSTEM', label: 'Ecosystem Lead' },
  { value: 'DEVELOPER', label: 'Developer Inquiry' },
] as const

export const CONTACT_CATEGORY_LABELS: Record<string, string> = {
  GENERAL_INQUIRY: 'General Inquiry',
  PROPERTY_INQUIRY: 'Property Inquiry',
  AGENT_INQUIRY: 'Agent Inquiry',
}

export const ECOSYSTEM_CATEGORIES: { value: LeadEcosystemCategory; label: string }[] = [
  { value: 'HOME_LOANS', label: 'Home Loans & Finance' },
  { value: 'LEGAL', label: 'Legal & Documentation' },
  { value: 'INSURANCE', label: 'Property Insurance' },
  { value: 'INTERIOR', label: 'Interior Design & Renovation' },
  { value: 'PACKERS', label: 'Packers & Movers' },
  { value: 'PROPERTY_MANAGEMENT', label: 'Property Management' },
  { value: 'VASTU', label: 'Vastu / Feng Shui' },
  { value: 'TILES', label: 'Tiles & Surface Finishing' },
  { value: 'HARDWARE', label: 'Hardware & Architectural Fittings' },
  { value: 'CEMENT', label: 'Cement & Structural' },
  { value: 'SMART_HOME', label: 'Smart Home & Automation' },
  { value: 'TECHNOLOGY', label: 'Technology Partners' },
]

export const ECOSYSTEM_CATEGORY_LABEL: Record<LeadEcosystemCategory, string> = Object.fromEntries(
  ECOSYSTEM_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<LeadEcosystemCategory, string>

export function displayCategory(leadType: LeadType, category: string | null | undefined) {
  if (!category) return '—'
  if (leadType === 'THREE_D_TOUR') {
    return inquiryTypeLabel(category)
  }
  if (leadType === 'ECOSYSTEM') {
    return ECOSYSTEM_CATEGORY_LABEL[category as LeadEcosystemCategory] || category
  }
  if (leadType === 'CONTACT') {
    return CONTACT_CATEGORY_LABELS[category] || category
  }
  return category
}

export const PROJECT_STATUSES = [
  'NEW',
  'CONTACTED',
  'SITE_VISIT_SCHEDULED',
  'QUALIFIED',
  'CONVERTED',
  'CLOSED',
] as const

export const CONTACT_STATUSES = ['NEW', 'CONTACTED', 'RESOLVED', 'CLOSED'] as const

export const ECOSYSTEM_STATUSES = [
  'APPLIED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ONBOARDED',
] as const

export { THREE_D_TOUR_STATUSES }

export const THREE_D_TOUR_PROPERTY_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All property types' },
  { value: 'DEVELOPER_PROJECT', label: 'Developer Project' },
  { value: 'RESIDENTIAL_PROPERTY', label: 'Residential Property' },
  { value: 'LUXURY_VILLA', label: 'Luxury Villa' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'COMMERCIAL_PROPERTY', label: 'Commercial Property' },
  { value: 'HOTEL_RESORT', label: 'Hotel / Resort' },
  { value: 'INTERIOR_DESIGN', label: 'Interior Design Showcase' },
  { value: 'ARCHITECTURAL', label: 'Architectural Project' },
  { value: 'OTHER', label: 'Other' },
] as const

export const BUDGET_RANGE_FILTER_OPTIONS = [
  { value: '', label: 'All budgets' },
  { value: 'UNDER_25K', label: 'Under ₹25,000' },
  { value: '25K_50K', label: '₹25,000 - ₹50,000' },
  { value: '50K_100K', label: '₹50,000 - ₹1,00,000' },
  { value: '100K_PLUS', label: '₹1,00,000+' },
  { value: 'NEED_CONSULTATION', label: 'Need Consultation' },
] as const

export function statusesForLeadType(leadType: LeadType | '' | null | undefined): readonly string[] {
  if (leadType === 'THREE_D_TOUR') return THREE_D_TOUR_STATUSES
  if (leadType === 'PROJECT') return PROJECT_STATUSES
  if (leadType === 'CONTACT') return CONTACT_STATUSES
  if (leadType === 'ECOSYSTEM') return ECOSYSTEM_STATUSES
  return [
    ...new Set([
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'APPROVED',
      'REJECTED',
      'CLOSED',
      ...THREE_D_TOUR_STATUSES,
      ...PROJECT_STATUSES,
      ...CONTACT_STATUSES,
      ...ECOSYSTEM_STATUSES,
    ]),
  ]
}

export const COUNTRY_FILTER_OPTIONS: { value: LeadCountry | ''; label: string }[] = [
  { value: '', label: 'All Countries' },
  { value: 'INDIA', label: 'India' },
  { value: 'UAE', label: 'UAE' },
]

export const DATE_RANGE_PRESETS = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'custom', label: 'Custom' },
] as const

export function parseDateRange(params: {
  range?: string
  from?: string
  to?: string
}): { gte?: Date; lte?: Date } | undefined {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  const range = String(params.range || '').toLowerCase()
  if (!range) return undefined

  if (range === 'custom') {
    const from = params.from ? new Date(params.from) : null
    const to = params.to ? new Date(params.to) : null
    if (!from && !to) return undefined
    return {
      gte: from ? startOfDay(from) : undefined,
      lte: to ? endOfDay(to) : undefined,
    }
  }

  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  if (range === 'today') return { gte: todayStart, lte: todayEnd }
  if (range === 'yesterday') {
    const y = new Date(todayStart)
    y.setDate(y.getDate() - 1)
    return { gte: startOfDay(y), lte: endOfDay(y) }
  }
  if (range === '7d') {
    const gte = new Date(todayStart)
    gte.setDate(gte.getDate() - 6)
    return { gte, lte: todayEnd }
  }
  if (range === '30d') {
    const gte = new Date(todayStart)
    gte.setDate(gte.getDate() - 29)
    return { gte, lte: todayEnd }
  }

  return undefined
}
