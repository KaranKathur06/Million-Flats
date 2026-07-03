import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminLoginClient from './AdminLoginClient'

export default async function AdminLoginPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (session?.user) {
    redirect(getHomeRouteForRole(role))
  }

  return (
    <Suspense fallback={null}>
      <AdminLoginClient />
    </Suspense>
  )
}
