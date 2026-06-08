import { sendEmail } from '@/lib/email/sendEmail'
import type { LeadType } from '@prisma/client'
import { LEAD_TYPE_LABELS } from '@/lib/leads/constants'
import { budgetRangeLabel, inquiryTypeLabel } from '@/lib/leads/threeDTour'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export function getLeadsNotifyEmail() {
  return (
    safeString(process.env.LEADS_NOTIFY_EMAIL) ||
    safeString(process.env.THREE_D_TOUR_LEADS_NOTIFY_EMAIL) ||
    safeString(process.env.ECOSYSTEM_LEADS_NOTIFY_EMAIL) ||
    safeString(process.env.ADMIN_NOTIFY_EMAIL) ||
    ''
  )
}

function baseUrl() {
  return safeString(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL)
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
  const to = getLeadsNotifyEmail()
  if (!to) return { ok: false as const, skipped: true }

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

  return sendEmail({ to, subject, text: lines.join('\n') })
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
