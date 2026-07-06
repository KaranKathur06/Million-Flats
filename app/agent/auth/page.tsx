import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AgentAuthClient from './AgentAuthClient'
import type { Metadata } from 'next'

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
  if (session?.user && (session.user as any)?.role === 'AGENT') {
    redirect('/agent/dashboard')
  }

  const params = await searchParams
  const tab = params?.tab === 'register' ? 'register' : 'login'

  return (
    <Suspense fallback={null}>
      <AgentAuthClient defaultTab={tab} />
    </Suspense>
  )
}
