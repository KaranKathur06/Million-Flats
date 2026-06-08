import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import SitemapDashboardClient from './SitemapDashboardClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Sitemap Dashboard | Admin | MillionFlats',
}

export default async function SitemapDashboardPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/auth/login?next=%2Fadmin%2Fseo%2Fsitemap-dashboard')
  }

  if (!hasMinRole(role, 'MODERATOR')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  return <SitemapDashboardClient />
}
