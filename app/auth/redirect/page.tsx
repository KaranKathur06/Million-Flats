import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const session = await getServerSession(authOptions)
  const sessionRole = String((session?.user as any)?.role || '').toUpperCase()
  const hasSession = Boolean(session?.user)

  const legacyToken = cookies().get('token')?.value
  const jwtSecret = process.env.JWT_SECRET
  let legacyRole = ''
  let hasLegacyToken = false
  if (legacyToken && jwtSecret) {
    try {
      const decoded = jwt.verify(legacyToken, jwtSecret) as any
      legacyRole = String(decoded?.role || '').toUpperCase()
      hasLegacyToken = true
    } catch {
      legacyRole = ''
    }
  }

  const role = sessionRole || legacyRole || ((hasSession || hasLegacyToken) ? 'USER' : '')

  if (!role) {
    redirect('/user/login')
  }

  const intentRaw = searchParams?.intent
  const intent = Array.isArray(intentRaw) ? intentRaw[0] : intentRaw

  const email = String((session?.user as any)?.email || '').trim().toLowerCase()
  const dbRole = email
    ? String((await prisma.user.findUnique({ where: { email }, select: { role: true } }))?.role || '').toUpperCase()
    : ''

  const effectiveRole = dbRole || role

  if (intent === 'agent' && effectiveRole === 'USER') {
    redirect('/agent/onboarding')
  }

  if (effectiveRole === 'AGENT') {
    redirect('/agent-portal')
  }

  redirect('/dashboard')
}
