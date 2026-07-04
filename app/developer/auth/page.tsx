import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DeveloperAuthClient from './DeveloperAuthClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Developer Access | MillionFlats',
  description: 'Join MillionFlats as a verified real estate developer. Login or register your company.',
}

export default async function DeveloperAuthPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (session?.user && (session.user as any)?.role === 'DEVELOPER') {
    redirect('/developer/dashboard')
  }

  const params = await searchParams
  const tab = params?.tab === 'register' ? 'register' : 'login'

  return (
    <Suspense>
      <DeveloperAuthClient defaultTab={tab} />
    </Suspense>
  )
}
