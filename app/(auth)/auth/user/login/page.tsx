import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AuthUserLoginClient from './AuthUserLoginClient'

export default async function AuthUserLoginPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const role = String((session.user as any)?.role || '').toUpperCase()
    redirect(getHomeRouteForRole(role))
  }

  return (
    <Suspense fallback={null}>
      <AuthUserLoginClient />
    </Suspense>
  )
}
