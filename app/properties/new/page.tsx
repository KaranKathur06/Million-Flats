import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function NewPropertyPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/login?next=%2Fproperties%2Fnew')
  }

  if (role !== 'AGENT') {
    redirect(getHomeRouteForRole(role))
  }

  redirect('/properties/new/manual')
}
