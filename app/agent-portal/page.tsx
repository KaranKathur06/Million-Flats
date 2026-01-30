import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgentDashboardPage from '@/app/agent/dashboard/page'

export default async function AgentPortalPage() {
  const session = await getServerSession(authOptions)
  const sessionRole = String((session?.user as any)?.role || '').toUpperCase()
  const sessionEmail = String((session?.user as any)?.email || '').trim().toLowerCase()

  const dbRole = sessionEmail
    ? String((await prisma.user.findUnique({ where: { email: sessionEmail }, select: { role: true } }))?.role || '').toUpperCase()
    : ''

  const role = dbRole || sessionRole

  if (!role) {
    redirect('/agent/login')
  }

  if (role !== 'AGENT') {
    redirect('/user/dashboard')
  }

  return <AgentDashboardPage />
}
