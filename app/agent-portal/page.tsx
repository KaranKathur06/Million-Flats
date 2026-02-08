import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgentDashboardPage from '@/app/agent/dashboard/page'

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
  const isApproved = Boolean(dbUser?.agent?.approved)

  if (!role) {
    redirect('/agent/login')
  }

  if (role !== 'AGENT') {
    redirect('/user/dashboard')
  }

  if (status !== 'ACTIVE' || !isApproved) {
    redirect('/agent/login?error=account_disabled')
  }

  return <AgentDashboardPage />
}
