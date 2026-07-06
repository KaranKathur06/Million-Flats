import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import AdminShell from './AdminShell'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // This layout wraps all /admin/* routes, including /admin/login
  // We need to allow auth pages to render without authentication checks
  // The middleware already handles protecting these routes, so the layout should not double-check
  
  // Get the session but don't redirect on auth pages - they handle their own flow
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  // Only apply auth guards to non-login routes
  // The AdminLoginClient and page.tsx handle auth page logic independently
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
