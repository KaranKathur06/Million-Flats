import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AgentAuthClient from './AgentAuthClient'
import type { Metadata } from 'next'
import { getAgentAuthRedirect } from '@/lib/auth/agentRedirect'

export const metadata: Metadata = {
  title: 'Agent Access | MillionFlats',
  description: 'Choose to login or register as an agent on MillionFlats and start managing your real estate pipeline.',
}

export default async function AgentAuthPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (sessionUser && String(sessionUser.role || '').toUpperCase() === 'AGENT') {
    redirect(getAgentAuthRedirect({
      status: sessionUser.agentStatus,
      emailVerified: Boolean(sessionUser.emailVerified),
      email: sessionUser.email,
    }))
  }

  const params = await searchParams
  const tab = params?.tab === 'register' ? 'register' : 'login'

  return (
    <Suspense fallback={null}>
      <AgentAuthClient defaultTab={tab} />
    </Suspense>
  )
}
