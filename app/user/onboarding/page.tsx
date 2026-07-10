import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import UserOnboardingClient from './UserOnboardingClient'

export const metadata = {
  title: 'Complete Your Profile | MillionFlats',
}

export default async function UserOnboardingPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login?next=%2Fuser%2Fonboarding')
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  
  // Fetch latest state from DB to populate initial data and step
  const user = email
    ? await prisma.user.findUnique({
        where: { email }
      })
    : null

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <Suspense fallback={null}>
      <UserOnboardingClient initialData={user} />
    </Suspense>
  )
}
