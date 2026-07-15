import { createLead } from '@/lib/leads/createLead'
import { normalizeLeadType, type LeadType } from '@/lib/leads/types'

/**
 * MeetingCategory is defined in prisma/schema.prisma.
 * In this repo, Prisma client enums may not be available as exported TS types,
 * so we use MeetingCategory as an untyped runtime string key.
 */
type MeetingCategory = string

type CategoryMapping = {
  leadType: LeadType
  category: string
}

const MEETING_CATEGORY_TO_LEAD: Record<string, CategoryMapping> = {
  THREE_D_TOUR: { leadType: 'THREE_D_TOUR', category: 'THREE_D_TOUR' },

  AGENT_REGISTRATION: { leadType: 'CONTACT', category: 'AGENT_REGISTRATION' },
  AGENCY_REGISTRATION: { leadType: 'CONTACT', category: 'AGENCY_REGISTRATION' },
  DEVELOPER_REGISTRATION: { leadType: 'CONTACT', category: 'DEVELOPER_REGISTRATION' },

  PROPERTY_BUYER: { leadType: 'CONTACT', category: 'PROPERTY_BUYER' },
  PROPERTY_SELLER: { leadType: 'CONTACT', category: 'PROPERTY_SELLER' },

  ADVERTISEMENT: { leadType: 'CONTACT', category: 'ADVERTISEMENT' },

  ECOSYSTEM_PARTNERS: { leadType: 'ECOSYSTEM', category: 'ECOSYSTEM_PARTNERS' },
}

export function getLeadMapping(meetingCategory: MeetingCategory): CategoryMapping {
  return MEETING_CATEGORY_TO_LEAD[meetingCategory]
}

export type CreateMeetingLeadInput = {
  meetingCategory: MeetingCategory
  name: string
  email: string
  phone?: string | null
  country: string
  city: string
  message?: string | null
  referenceId: string
  timezone: string
  meetingDate: Date
  meetingTime: string
  utm?: {
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
    utmTerm?: string | null
    utmContent?: string | null
    referrer?: string | null
    landingUrl?: string | null
  }
}

/**
 * Creates the CRM lead for a booking using existing CRM infrastructure.
 * Email/notifications are handled by createLead + notifyAdminNewLead.
 */
export async function createMeetingBookingLead(input: CreateMeetingLeadInput) {
  const mapping = getLeadMapping(input.meetingCategory)

  const leadType = normalizeLeadType(mapping.leadType)

  if (!leadType) {
    throw new Error(`Unable to map leadType for meetingCategory=${input.meetingCategory}`)
  }

  return createLead({
    leadType,
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    message: input.message ? input.message : `Meeting Booking ${input.referenceId}`,
    category: mapping.category,
    sourceName: 'Meeting Booking',
    sourceId: input.referenceId,
    country: input.country as any,
    status: 'NEW',
    legacyTable: 'meeting_bookings',
    legacyId: input.referenceId,
    notify: true,
    utmSource: input.utm?.utmSource ?? null,
    utmMedium: input.utm?.utmMedium ?? null,
    utmCampaign: input.utm?.utmCampaign ?? null,
    utmTerm: input.utm?.utmTerm ?? null,
    utmContent: input.utm?.utmContent ?? null,
    referrer: input.utm?.referrer ?? null,
    landingUrl: input.utm?.landingUrl ?? null,
  })
}
