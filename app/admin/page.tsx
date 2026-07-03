import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { getOperationsDashboardData } from '@/lib/admin/operationsDashboard'
import AdminOperationsDashboard from '@/components/admin/AdminOperationsDashboard'

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/admin/login?next=%2Fadmin')
  }

  if (!hasMinRole(role, 'MODERATOR')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const data = await getOperationsDashboardData()

  return <AdminOperationsDashboard data={data} />
}
