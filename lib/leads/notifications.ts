import { sendEmail } from '@/lib/email/sendEmail'
import type { LeadType } from '@prisma/client'
import { LEAD_TYPE_LABELS } from '@/lib/leads/constants'
import { budgetRangeLabel, inquiryTypeLabel } from '@/lib/leads/threeDTour'
import { getBaseUrl } from '@/lib/auth/routes'
import { getAdminNotificationEmail, sendAdminNotification } from '@/lib/email/adminNotifications'

export function getLeadsNotifyEmail() {
  return getAdminNotificationEmail()
}

function baseUrl() {
  return getBaseUrl()
}

export async function notifyAdminNewLead(params: {
  leadType: LeadType
  leadId: string
  name: string
  email: string
  phone?: string | null
  category?: string | null
  projectOrCompany?: string | null
  message?: string | null
  propertyName?: string | null
  budgetRange?: string | null
  timeline?: string | null
}) {
  const typeLabel = LEAD_TYPE_LABELS[params.leadType] || params.leadType
  const subject =
    params.leadType === 'THREE_D_TOUR'
      ? 'New 3D Tour Inquiry'
      : params.leadType === 'PROJECT'
        ? `New Project Inquiry: ${params.category || params.projectOrCompany || 'Project'}`
        : `New ${typeLabel}`

  const lines = [
    `New lead on MillionFlats`,
    '',
    `Lead ID: ${params.leadId}`,
    `Type: ${typeLabel}`,
    params.category
      ? `Category: ${params.leadType === 'THREE_D_TOUR' ? inquiryTypeLabel(params.category) : params.category}`
      : null,
    params.propertyName ? `Property: ${params.propertyName}` : null,
    params.budgetRange ? `Budget: ${budgetRangeLabel(params.budgetRange)}` : null,
    params.timeline ? `Timeline: ${params.timeline}` : null,
    params.projectOrCompany ? `Project / Company: ${params.projectOrCompany}` : null,
    `Name: ${params.name}`,
    `Email: ${params.email}`,
    params.phone ? `Phone: ${params.phone}` : null,
    '',
    params.message ? `Message:\n${params.message}` : null,
    '',
    `Review: ${baseUrl()}/admin/leads?leadType=THREE_D_TOUR`,
  ].filter(Boolean)

  return sendAdminNotification({
    eventType: 'LEAD_CREATED',
    eventId: params.leadId,
    subject,
    text: lines.join('\n'),
  })
}

export async function notifyUserThreeDTourReceived(params: {
  email: string
  name: string
}) {
  const subject = 'Your 3D Tour Demo Request Has Been Received'
  const lines = [
    `Hi ${params.name},`,
    '',
    'Thank you for requesting a free 3D Tour demo with MillionFlats.',
    '',
    'Our team has received your inquiry and will contact you shortly with pricing,',
    'project consultation details, and next steps.',
    '',
    'You can track updates by logging into your MillionFlats account.',
    '',
    '— MillionFlats Team',
  ]

  return sendEmail({ to: params.email, subject, text: lines.join('\n') })
}
