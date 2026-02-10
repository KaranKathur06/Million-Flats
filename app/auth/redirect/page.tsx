import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const intentRaw = searchParams?.intent
  const intent = Array.isArray(intentRaw) ? intentRaw[0] : intentRaw

  const nextRaw = searchParams?.next
  const next = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : ''

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

  if (!hasSession && !legacyRole) {
    if (safeNext) {
      const loginPath = intent === 'agent' ? '/agent/login' : '/user/login'
      redirect(`${loginPath}?next=${encodeURIComponent(safeNext)}`)
    }
    redirect(intent === 'agent' ? '/agent/login' : '/user/login')
  }

  const email = String((session?.user as any)?.email || '').trim().toLowerCase()
  const dbRole = email
    ? String((await prisma.user.findUnique({ where: { email }, select: { role: true } }))?.role || '').toUpperCase()
    : ''

  const effectiveRole = dbRole || sessionRole || legacyRole

  if (intent === 'agent' && email) {
    const dbUser = await (prisma as any).user
      .findUnique({ where: { email }, select: { role: true, status: true, agent: { select: { id: true, approved: true, profileStatus: true } } } })
      .catch(() => null)

    const hasAgentRow = Boolean((dbUser as any)?.agent?.id)
    const dbUserRole = String((dbUser as any)?.role || effectiveRole || '').toUpperCase()
    const dbStatus = String((dbUser as any)?.status || 'ACTIVE').toUpperCase()
    const approved = Boolean((dbUser as any)?.agent?.approved)
    const profileStatus = String((dbUser as any)?.agent?.profileStatus || 'DRAFT').toUpperCase()

    if (!hasAgentRow) {
      redirect('/agent/login?error=not_registered')
    }

    if (dbStatus !== 'ACTIVE') {
      redirect('/agent/login?error=account_disabled')
    }

    if (dbUserRole !== 'AGENT') {
      const reason = profileStatus === 'SUBMITTED' ? 'under_review' : profileStatus === 'VERIFIED' ? 'not_approved' : 'complete_profile'
      redirect(`/agent/profile?notice=${encodeURIComponent(reason)}`)
    }

    if (!approved || profileStatus !== 'LIVE') {
      const reason = profileStatus === 'SUBMITTED' ? 'under_review' : profileStatus === 'VERIFIED' ? 'not_approved' : 'complete_profile'
      redirect(`/agent/profile?notice=${encodeURIComponent(reason)}`)
    }
  }

  const home = getHomeRouteForRole(effectiveRole)

  if (safeNext) {
    redirect(safeNext)
  }

  redirect(home)
}
