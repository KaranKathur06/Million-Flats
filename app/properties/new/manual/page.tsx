import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import ManualPropertyWizardClient from './ManualPropertyWizardClient'

export default async function ManualPropertyNewPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/login?next=%2Fproperties%2Fnew%2Fmanual')
  }

  if (role !== 'AGENT') {
    redirect(getHomeRouteForRole(role))
  }

  return <ManualPropertyWizardClient />
}
