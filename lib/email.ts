import nodemailer from 'nodemailer'

type SendEmailArgs = {
  to: string
  subject: string
  text: string
}

function hasSmtpEnv() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export async function sendEmail(args: SendEmailArgs) {
  if (!hasSmtpEnv()) return { skipped: true as const }

  const host = String(process.env.SMTP_HOST)
  const port = Number(process.env.SMTP_PORT || '587')
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'
  const user = String(process.env.SMTP_USER)
  const pass = String(process.env.SMTP_PASS)
  const from = String(process.env.SMTP_FROM || process.env.SMTP_USER)

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from,
    to: args.to,
    subject: args.subject,
    text: args.text,
  })

  return { skipped: false as const }
}

export function formatEcosystemLeadEmail(params: {
  categorySlug: string
  partnerId?: string | null
  name: string
  email: string
  phone: string
  message: string
  source?: string | null
  leadId: string
}) {
  const lines = [
    `New Ecosystem Lead`,
    '',
    `Lead ID: ${params.leadId}`,
    `Category: ${params.categorySlug}`,
    `Partner ID: ${params.partnerId || 'N/A'}`,
    `Name: ${params.name}`,
    `Email: ${params.email}`,
    `Phone: ${params.phone}`,
    `Source: ${params.source || 'N/A'}`,
    '',
    `Message:`,
    params.message,
  ]

  return {
    subject: `New Ecosystem Lead: ${params.categorySlug}`,
    text: lines.join('\n'),
  }
}
