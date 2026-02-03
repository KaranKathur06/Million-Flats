import nodemailer from 'nodemailer'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function getBaseUrl() {
  const base = safeString(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL)
  return base ? base.replace(/\/$/, '') : 'http://localhost:3000'
}

export function buildAbsoluteUrl(pathname: string) {
  const base = getBaseUrl()
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${path}`
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const host = safeString(process.env.SMTP_HOST)
  const portRaw = safeString(process.env.SMTP_PORT)
  const user = safeString(process.env.SMTP_USER)
  const pass = safeString(process.env.SMTP_PASS)
  const from = safeString(process.env.SMTP_FROM) || 'no-reply@millionflats.com'

  if (!host || !portRaw || !user || !pass) {
    console.log('email_not_configured', { to: input.to, subject: input.subject })
    return { ok: true as const, mode: 'log' as const }
  }

  const port = Number(portRaw)

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: Number.isFinite(port) ? port === 465 : false,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })

    return { ok: true as const, mode: 'smtp' as const }
  } catch (e) {
    console.error('email_send_failed', e)
    return { ok: false as const, error: e }
  }
}
