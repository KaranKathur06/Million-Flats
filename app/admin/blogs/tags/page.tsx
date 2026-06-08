import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { TagManager } from '@/components/admin/blogs/tag-manager'

export default async function BlogTagsPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fblogs%2Ftags')
  }

  if (!hasMinRole(role as any, 'ADMIN' as any) && !hasMinRole(role as any, 'EDITOR' as any)) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const tags = await (prisma as any).tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { blogTags: true },
      },
    },
  }).catch(() => [])

  // Transform for TagManager
  const transformedTags = (tags as any[]).map(t => ({
    ...t,
    _count: { blogs: t._count?.blogTags || 0 }
  }))

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Blog CMS
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Tags</h1>
          <p className="mt-1 text-sm text-white/50">Manage blog tags for better organization</p>
        </div>
        <Link
          href="/admin/blogs/dashboard"
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Blog Dashboard
        </Link>
      </div>

      <TagManager initialTags={transformedTags} />
    </div>
  )
}
