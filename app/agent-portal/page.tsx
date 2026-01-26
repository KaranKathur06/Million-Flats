import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgentDashboardPage from '@/app/agent/dashboard/page'

export default async function AgentPortalPage() {
  const session = await getServerSession(authOptions)
  const sessionRole = String((session?.user as any)?.role || '').toUpperCase()
  const hasSession = Boolean(session?.user)
  const sessionEmail = String((session?.user as any)?.email || '').trim().toLowerCase()

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

  const dbRole = sessionEmail
    ? String((await prisma.user.findUnique({ where: { email: sessionEmail }, select: { role: true } }))?.role || '').toUpperCase()
    : ''

  const role = dbRole || sessionRole || legacyRole || ((hasSession || hasLegacyToken) ? 'USER' : '')

  if (!role) {
    redirect('/agent/login')
  }

  if (role !== 'AGENT') {
    redirect('/dashboard')
  }

  return <AgentDashboardPage />
}
