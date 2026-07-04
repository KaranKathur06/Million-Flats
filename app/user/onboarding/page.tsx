import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { normalizeRole } from '@/lib/rbac'
import UserOnboardingClient from './UserOnboardingClient'

export const metadata = {
  title: 'Complete Your Profile | MillionFlats',
}

export default async function UserOnboardingPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fuser%2Fonboarding')
  }

  if (role !== 'USER') {
    redirect('/')
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { profileCompletion: true },
      })
    : null

  if (user?.profileCompletion && user.profileCompletion >= 100) {
    redirect('/dashboard')
  }

  return (
    <Suspense fallback={null}>
      <UserOnboardingClient />
    </Suspense>
  )
}
