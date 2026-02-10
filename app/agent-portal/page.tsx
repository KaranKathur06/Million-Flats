import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function AgentPortalPage() {
  const session = await getServerSession(authOptions)
  const sessionRole = String((session?.user as any)?.role || '').toUpperCase()
  const sessionEmail = String((session?.user as any)?.email || '').trim().toLowerCase()

  const dbUser = sessionEmail
    ? await (prisma as any).user
        .findUnique({ where: { email: sessionEmail }, select: { role: true, status: true, agent: { select: { approved: true } } } })
        .catch(() => null)
    : null

  const role = String(dbUser?.role || sessionRole || '').toUpperCase()
  const status = String(dbUser?.status || (session?.user as any)?.status || 'ACTIVE').toUpperCase()
  const profileStatus = String((dbUser as any)?.agent?.profileStatus || 'DRAFT').toUpperCase()

  if (!role) {
    redirect('/agent/login')
  }

  if (role !== 'AGENT') {
    redirect(getHomeRouteForRole(role))
  }

  if (status !== 'ACTIVE') {
    redirect('/agent/login?error=account_disabled')
  }

  if (profileStatus === 'LIVE') {
    redirect('/agent/dashboard')
  }

  redirect('/agent/profile?notice=complete_verification')
}
