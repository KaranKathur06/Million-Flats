import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import AdminShell from './AdminShell'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/admin/login?next=%2Fadmin')
  }

  if (!hasMinRole(role, 'MODERATOR')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[#080e1a] text-white"
      style={{ ['--admin-header-height' as string]: '4.5rem' }}
    >
      <AdminShell>{children}</AdminShell>
    </div>
  )
}
