import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import AdminShellHeaderClient from './AdminShellHeaderClient'
import AdminShellLayoutClient from './AdminShellLayoutClient'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/auth/login?next=%2Fadmin')
  }

  if (!hasMinRole(role, 'MODERATOR')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a1019]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1700px]">
          <AdminShellHeaderClient />
        </div>
      </header>

      <AdminShellLayoutClient>{children}</AdminShellLayoutClient>
    </div>
  )
}
