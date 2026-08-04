import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import AdminShell from './AdminShell'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { isPublicAuthPath } from '@/lib/auth/routes'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)
  const pathname = headers().get('x-pathname') || ''

  if (isPublicAuthPath(pathname)) {
    return (
      <div className="flex min-h-screen flex-col overflow-hidden bg-[#080e1a] text-white">
        {children}
      </div>
    )
  }

  if (session?.user && hasMinRole(role, 'MODERATOR')) {
    // User is authenticated with proper role - render with shell
    return (
      <div
        className="flex h-screen flex-col overflow-hidden bg-[#080e1a] text-white"
        style={{ ['--admin-header-height' as string]: '4.5rem' }}
      >
        <AdminShell>{children}</AdminShell>
      </div>
    )
  }

  // Not authenticated or wrong role - just render children
  // The page component (login) will handle showing appropriate content
  // Middleware will ensure this is only reached from /admin/login
  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[#080e1a] text-white"
      style={{ ['--admin-header-height' as string]: '4.5rem' }}
    >
      {children}
    </div>
  )
}
