import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import UserLoginClient from './UserLoginClient'

export default async function UserLoginPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const role = String((session.user as any)?.role || '').toUpperCase()
    redirect(getHomeRouteForRole(role))
  }

  return (
    <Suspense fallback={null}>
      <UserLoginClient />
    </Suspense>
  )
}
