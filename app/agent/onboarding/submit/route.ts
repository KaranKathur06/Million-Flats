import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const email = safeString((session?.user as any)?.email).toLowerCase()

  if (!email) {
    return NextResponse.redirect(new URL('/agent/login', req.url))
  }

  const form = await req.formData()
  const license = safeString(form.get('license'))
  const company = safeString(form.get('company'))
  const phone = safeString(form.get('phone'))

  if (!license) {
    return NextResponse.redirect(new URL('/agent/onboarding', req.url))
  }

  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true, accounts: true } })
  if (!dbUser) {
    return NextResponse.redirect(new URL('/agent/login', req.url))
  }

  if (dbUser.role !== 'AGENT' && dbUser.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/agent/login?error=not_an_agent', req.url))
  }

  const hasGoogleAccount = dbUser.accounts?.some((a) => a.provider === 'google')
  if (!hasGoogleAccount) {
    return NextResponse.redirect(new URL('/agent/login', req.url))
  }

  if (!dbUser.agent) {
    await prisma.agent.create({
      data: {
        userId: dbUser.id,
        license,
        company: company || null,
        whatsapp: null,
      },
    })
  } else {
    await prisma.agent.update({
      where: { userId: dbUser.id },
      data: {
        license,
        company: company || null,
      },
    })
  }

  if (phone && phone !== dbUser.phone) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        phone,
      },
    })
  }

  return NextResponse.redirect(new URL('/agent-portal', req.url))
}
