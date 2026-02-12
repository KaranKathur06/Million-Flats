import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgentLoginClient from './AgentLoginClient'

export default async function AgentLoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {  const session = await getServerSession(authOptions)
  const email = String((session?.user as any)?.email || '').trim().toLowerCase()

  if (email) {
    const user = await (prisma as any).user
      .findUnique({ where: { email }, select: { role: true, status: true, agent: { select: { id: true, approved: true, profileStatus: true } } } })
      .catch(() => null)

    const status = String((user as any)?.status || 'ACTIVE').toUpperCase()
    const role = String((user as any)?.role || (session?.user as any)?.role || '').toUpperCase()
    const hasAgentRow = Boolean((user as any)?.agent?.id)
    const approved = Boolean((user as any)?.agent?.approved)
    const profileStatus = String((user as any)?.agent?.profileStatus || 'DRAFT').toUpperCase()

    if (status !== 'ACTIVE') {
      const errRaw = searchParams?.error
      const err = Array.isArray(errRaw) ? errRaw[0] : errRaw

      // if we're already on /agent/login?error=account_disabled, do NOT redirect again.
      // just render the login page and let the client show the error.
      if (err !== 'account_disabled') {
        redirect('/agent/login?error=account_disabled')
      }
    }

    if (!hasAgentRow) {
      redirect(role === 'AGENT' ? '/agent/onboarding' : role === 'ADMIN' || role === 'SUPERADMIN' ? '/admin/dashboard' : '/user/dashboard')
    }

    if (role === 'AGENT' && approved && profileStatus === 'LIVE') {
      redirect('/agent/dashboard')
    }

    redirect(`/agent/profile?notice=${encodeURIComponent(profileStatus === 'SUBMITTED' ? 'under_review' : profileStatus === 'VERIFIED' ? 'not_approved' : 'complete_profile')}`)
  }

  return (
    <Suspense fallback={null}>
      <AgentLoginClient />
    </Suspense>
  )
}
