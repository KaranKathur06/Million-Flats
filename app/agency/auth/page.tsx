import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AgencyAuthClient from './AgencyAuthClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agency Access | MillionFlats',
  description: 'Join MillionFlats as a verified real estate agency. Login or register your agency.',
}

export default async function AgencyAuthPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions)
  if (session?.user && (session.user as any)?.role === 'AGENCY') {
    redirect('/agency/dashboard')
  }
  const params = await searchParams
  const tab = params?.tab === 'register' ? 'register' : 'login'
  return (
    <Suspense>
      <AgencyAuthClient defaultTab={tab} />
    </Suspense>
  )
}
