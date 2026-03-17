import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

/**
 * Build an absolute redirect URL that works both locally and behind a reverse-proxy.
 * req.nextUrl.clone() can resolve to `localhost:3000` when the request comes in
 * via a form POST from the browser through a proxy — instead we read the
 * forwarded host / protocol from the incoming request headers.
 */
function redirectTo(req: NextRequest, path: string, search = '') {
  // Prefer the forwarded host (behind nginx/Cloudflare), fall back to the request host
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'millionflats.com'
  const base = `${proto}://${host}`
  return NextResponse.redirect(`${base}${path}${search}`, { status: 303 })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = safeString((session?.user as any)?.email).toLowerCase()

  if (!email) {
    return redirectTo(req, '/agent/login')
  }

  const form = await req.formData()
  const license = safeString(form.get('license'))
  const company = safeString(form.get('company'))
  const phone = safeString(form.get('phone'))

  if (!license) {
    return redirectTo(req, '/agent/onboarding')
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: { agent: true, accounts: true },
  })
  if (!dbUser) {
    return redirectTo(req, '/agent/login')
  }

  const isEmailVerified = Boolean((dbUser as any).emailVerified) || Boolean((dbUser as any).verified)

  if (!dbUser.agent) {
    await prisma.agent.create({
      data: {
        userId: dbUser.id,
        license,
        company: company || null,
        whatsapp: null,
        approved: false,
        status: isEmailVerified ? 'EMAIL_VERIFIED' : 'REGISTERED',
      } as any,
    })
  } else {
    const currentStatus = String((dbUser.agent as any)?.status || 'REGISTERED')
    const nextStatus =
      currentStatus === 'REGISTERED'    ? 'EMAIL_VERIFIED' :
      currentStatus === 'EMAIL_VERIFIED' ? 'PROFILE_INCOMPLETE' :
      currentStatus

    await prisma.agent.update({
      where: { userId: dbUser.id },
      data: { license, company: company || null, status: nextStatus } as any,
    })
  }

  if (phone && phone !== dbUser.phone) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { phone, role: 'AGENT' },
    })
  } else if (String((dbUser as any)?.role || '').toUpperCase() !== 'AGENT') {
    await prisma.user.update({ where: { id: dbUser.id }, data: { role: 'AGENT' } as any }).catch(() => null)
  }

  return redirectTo(req, '/agent/profile', '?notice=complete_profile')
}
