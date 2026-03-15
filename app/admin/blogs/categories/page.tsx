import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function BlogCategoriesPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fblogs%2Fcategories')
  }

  if (!hasMinRole(role as any, 'ADMIN' as any) && !hasMinRole(role as any, 'EDITOR' as any)) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const categories = await (prisma as any).category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { blogs: true },
      },
    },
  }).catch(() => [])

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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-white/50">Manage blog categories and organization</p>
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

      {/* Categories list */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        {(categories as any[]).length > 0 ? (
          <div className="space-y-2">
            {(categories as any[]).map((cat: any) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.04] transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-xs font-bold text-amber-300">
                    {cat.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/85">{cat.name}</p>
                    <p className="text-xs text-white/40">/{cat.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">{cat._count?.blogs || 0} blogs</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-sm text-white/40">No categories created yet</p>
            <p className="text-xs text-white/30 mt-1">Categories will appear here when you create them via the API</p>
          </div>
        )}
      </div>
    </div>
  )
}
