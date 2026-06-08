/** 3D Tour inquiry pipeline — form options, statuses, metadata shape */

export const THREE_D_TOUR_PIPELINE = '3D_TOUR_PIPELINE' as const

export const THREE_D_TOUR_STATUSES = [
  'NEW_INQUIRY',
  'QUALIFICATION',
  'CONTACTED',
  'DEMO_SCHEDULED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const

export type ThreeDTourStatus = (typeof THREE_D_TOUR_STATUSES)[number]

export const INQUIRY_TYPE_OPTIONS = [
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

export const AREA_UNIT_OPTIONS = [
  { value: 'SQ_FT', label: 'Sq.ft' },
  { value: 'SQ_M', label: 'Sq.m' },
  { value: 'ACRES', label: 'Acres' },
] as const

export const SERVICE_REQUIREMENT_OPTIONS = [
  { value: '3D_WALKTHROUGH', label: '3D Walkthrough' },
  { value: 'MATTERPORT_SCAN', label: 'Matterport Scan' },
  { value: 'VIRTUAL_STAGING', label: 'Virtual Staging' },
  { value: 'DRONE_SHOOT', label: 'Drone Shoot' },
  { value: 'HDR_PHOTOGRAPHY', label: 'HDR Photography' },
  { value: 'FLOOR_PLAN', label: 'Floor Plan Creation' },
  { value: 'VIDEO_TOUR', label: 'Video Tour' },
  { value: 'CUSTOM_BRANDING', label: 'Custom Branding' },
] as const

export const PROJECT_SCOPE_OPTIONS = [
  { value: 'SINGLE_UNIT', label: 'Single Unit' },
  { value: 'MULTIPLE_UNITS', label: 'Multiple Units' },
  { value: 'ENTIRE_PROJECT', label: 'Entire Project' },
  { value: 'DEVELOPER_PORTFOLIO', label: 'Developer Portfolio' },
  { value: 'COMMERCIAL_CAMPUS', label: 'Commercial Campus' },
] as const

export const TIMELINE_OPTIONS = [
  { value: 'IMMEDIATELY', label: 'Immediately' },
  { value: 'WITHIN_7_DAYS', label: 'Within 7 Days' },
  { value: 'WITHIN_30_DAYS', label: 'Within 30 Days' },
  { value: 'PLANNING_STAGE', label: 'Planning Stage' },
] as const

export const BUDGET_RANGE_OPTIONS = [
  { value: 'UNDER_25K', label: 'Under ₹25,000' },
  { value: '25K_50K', label: '₹25,000 - ₹50,000' },
  { value: '50K_100K', label: '₹50,000 - ₹1,00,000' },
  { value: '100K_PLUS', label: '₹1,00,000+' },
  { value: 'NEED_CONSULTATION', label: 'Need Consultation' },
] as const

export const LEAD_SOURCE_VALUES = [
  'WEBSITE',
  'REFERRAL',
  'AGENT',
  'DEVELOPER',
  'GOOGLE',
  'SOCIAL_MEDIA',
  'DIRECT',
] as const

export type ThreeDTourLeadMetadata = {
  pipeline: typeof THREE_D_TOUR_PIPELINE
  inquiryType: string
  city?: string | null
  state?: string | null
  propertyAddress?: string | null
  projectName?: string | null
  pinCode?: string | null
  builtUpArea?: string | null
  areaUnit?: string | null
  serviceRequirements: string[]
  projectScope?: string | null
  leadSource: string
  referralCode?: string | null
  referralPartnerId?: string | null
  /** VerixLead™ scoring inputs */
  aiScoring?: {
    propertySize?: string | null
    budget?: string | null
    timeline?: string | null
    projectScope?: string | null
    country?: string | null
  }
}

export function inquiryTypeLabel(code: string | null | undefined) {
  return INQUIRY_TYPE_OPTIONS.find((o) => o.value === code)?.label || code || '—'
}

export function budgetRangeLabel(code: string | null | undefined) {
  return BUDGET_RANGE_OPTIONS.find((o) => o.value === code)?.label || code || '—'
}

export function timelineLabel(code: string | null | undefined) {
  return TIMELINE_OPTIONS.find((o) => o.value === code)?.label || code || '—'
}

export function formatPropertySize(builtUpArea: string | null | undefined, areaUnit: string | null | undefined) {
  const area = String(builtUpArea || '').trim()
  if (!area) return null
  const unit = AREA_UNIT_OPTIONS.find((o) => o.value === areaUnit)?.label || areaUnit || ''
  return unit ? `${area} ${unit}` : area
}
