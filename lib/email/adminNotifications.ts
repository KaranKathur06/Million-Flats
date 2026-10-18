import { buildAbsoluteUrl, sendEmail } from '@/lib/email/sendEmail'

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function getAdminNotificationEmail() {
  return (
    safeString(process.env.ADMIN_NOTIFY_EMAIL) ||
    safeString(process.env.LEADS_NOTIFY_EMAIL) ||
    safeString(process.env.THREE_D_TOUR_LEADS_NOTIFY_EMAIL) ||
    safeString(process.env.ECOSYSTEM_LEADS_NOTIFY_EMAIL) ||
    ''
  )
}

export async function sendAdminNotification(params: {
  eventType: string
  eventId: string
  subject: string
  text: string
}) {
  const to = getAdminNotificationEmail()
  if (!to) {
    console.warn('[admin-notification] Missing admin inbox configuration', {
      eventType: params.eventType,
      eventId: params.eventId,
    })
    return { ok: false as const, skipped: true as const }
  }

  try {
    const result = await sendEmail({ to, subject: params.subject, text: params.text })
    if (!result.ok) {
      console.error('[admin-notification] Delivery failed', {
        eventType: params.eventType,
        eventId: params.eventId,
        skipped: result.skipped,
        error: 'error' in result ? result.error : undefined,
      })
    }
    return result
  } catch (error) {
    console.error('[admin-notification] Delivery failed', {
      eventType: params.eventType,
      eventId: params.eventId,
      error,
    })
    return { ok: false as const, error }
  }
}

export async function notifyAdminRegistration(params: {
  type: 'Agent' | 'Developer' | 'Ecosystem' | 'Agency'
  registrationId: string
  name: string
  email: string
  phone?: string | null
  businessName?: string | null
  adminPath: string
}) {
  const timestamp = new Date().toISOString()
  const subject = `New ${params.type} registration`
  const text = [
    `New ${params.type} registration on MillionFlats`,
    '',
    `Registration ID: ${params.registrationId}`,
    `Type: ${params.type}`,
    `Name: ${params.name}`,
    `Email: ${params.email}`,
    params.phone ? `Phone: ${params.phone}` : null,
    params.businessName ? `Business: ${params.businessName}` : null,
    `Registered at: ${timestamp}`,
    `Review: ${buildAbsoluteUrl(params.adminPath)}`,
  ].filter(Boolean).join('\n')

  return sendAdminNotification({
    eventType: `${params.type.toUpperCase()}_REGISTRATION`,
    eventId: params.registrationId,
    subject,
    text,
  })
}
