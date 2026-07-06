import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function AgentRegisterPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (session?.user) {
    if (role === 'AGENT') {
      redirect('/agent/dashboard')
    }
    redirect(getHomeRouteForRole(role))
  }

  redirect('/agent/auth?tab=register')
}
