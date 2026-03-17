import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = safeString((session?.user as any)?.email).toLowerCase()

  if (!email) {
    const url = req.nextUrl.clone()
    url.pathname = '/agent/login'
    return NextResponse.redirect(url)
  }

  const form = await req.formData()
  const license = safeString(form.get('license'))
  const company = safeString(form.get('company'))
  const phone = safeString(form.get('phone'))

  if (!license) {
    const url = req.nextUrl.clone()
    url.pathname = '/agent/onboarding'
    return NextResponse.redirect(url)
  }

  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true, accounts: true } })
  if (!dbUser) {
    const url = req.nextUrl.clone()
    url.pathname = '/agent/login'
    return NextResponse.redirect(url)
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
        // Set initial status: EMAIL_VERIFIED if email is verified, else REGISTERED
        status: isEmailVerified ? 'EMAIL_VERIFIED' : 'REGISTERED',
      } as any,
    })
  } else {
    // Agent exists: update license/company and advance status to PROFILE_INCOMPLETE
    const currentStatus = String((dbUser.agent as any)?.status || 'REGISTERED')
    const nextStatus =
      currentStatus === 'REGISTERED' ? 'EMAIL_VERIFIED' :
      currentStatus === 'EMAIL_VERIFIED' ? 'PROFILE_INCOMPLETE' :
      currentStatus // keep existing status if further along

    await prisma.agent.update({
      where: { userId: dbUser.id },
      data: {
        license,
        company: company || null,
        status: nextStatus,
      } as any,
    })
  }

  if (phone && phone !== dbUser.phone) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        phone,
        role: 'AGENT',
      },
    })
  } else if (String((dbUser as any)?.role || '').toUpperCase() !== 'AGENT') {
    await prisma.user.update({ where: { id: dbUser.id }, data: { role: 'AGENT' } as any }).catch(() => null)
  }

  // Redirect to profile page to continue onboarding
  const url = req.nextUrl.clone()
  url.pathname = '/agent/profile'
  url.search = '?notice=complete_profile'
  return NextResponse.redirect(url)
}
