import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function BlogDashboardPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fblogs')
  }

  if (!hasMinRole(role as any, 'ADMIN' as any) && !hasMinRole(role as any, 'EDITOR' as any)) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  // Fetch blog stats
  const [totalBlogs, publishedBlogs, draftBlogs, scheduledBlogs, totalViews, avgSeoScore, recentBlogs] = await Promise.all([
    (prisma as any).blog.count().catch(() => 0),
    (prisma as any).blog.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    (prisma as any).blog.count({ where: { status: 'DRAFT' } }).catch(() => 0),
    (prisma as any).blog.count({ where: { status: 'SCHEDULED' } }).catch(() => 0),
    (prisma as any).blog.aggregate({ _sum: { views: true } }).then((r: any) => r?._sum?.views || 0).catch(() => 0),
    (prisma as any).blog.aggregate({ _avg: { seoScore: true } }).then((r: any) => Math.round(r?._avg?.seoScore || 0)).catch(() => 0),
    (prisma as any).blog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
      },
    }).catch(() => []),
  ])

  const stats = [
    { label: 'Total Blogs', value: totalBlogs, color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20', text: 'text-blue-300', icon: '📝' },
    { label: 'Published', value: publishedBlogs, color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-300', icon: '✅' },
    { label: 'Drafts', value: draftBlogs, color: 'from-slate-400/15 to-slate-500/5', border: 'border-slate-400/15', text: 'text-slate-300', icon: '📄' },
    { label: 'Scheduled', value: scheduledBlogs, color: 'from-amber-400/20 to-amber-500/5', border: 'border-amber-400/20', text: 'text-amber-300', icon: '⏰' },
    { label: 'Total Views', value: totalViews, color: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/15', text: 'text-violet-300', icon: '👀' },
    { label: 'Avg SEO Score', value: `${avgSeoScore}%`, color: 'from-rose-500/20 to-rose-600/5', border: 'border-rose-500/20', text: 'text-rose-300', icon: '📊' },
  ]

  const quickLinks = [
    { href: '/admin/blogs/all', label: 'All Blogs', primary: false },
    { href: '/admin/blogs/new', label: 'Create Blog', primary: true },
    { href: '/admin/blogs/categories', label: 'Categories', primary: false },
  ]

  const formatDate = (date: any) => {
    try {
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return '—'
    }
  }

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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Blog Dashboard</h1>
          <p className="mt-1 text-[14px] text-white/50">Overview of your blog content and performance</p>
        </div>
        <Link
          href="/admin"
          className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Main Dashboard
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`group relative overflow-hidden rounded-2xl border ${s.border} bg-gradient-to-br ${s.color} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{s.label}</p>
                <p className={`mt-2 text-2xl font-bold ${s.text}`}>{s.value}</p>
              </div>
              <span className="text-lg opacity-60">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center justify-center h-10 px-5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${link.primary
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400'
                  : 'border border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15]'
                }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Blogs */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40">Recent Blogs</h2>
          <Link
            href="/admin/blogs/all"
            className="text-[12px] font-semibold text-amber-400/80 hover:text-amber-300 transition-colors"
          >
            View All →
          </Link>
        </div>

        {(recentBlogs as any[]).length > 0 ? (
          <div className="space-y-2">
            {(recentBlogs as any[]).map((blog: any) => (
              <div
                key={blog.id}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.04] transition-all duration-200"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <Link
                    href={`/admin/blogs/${blog.id}/edit`}
                    className="text-sm font-medium text-white/85 hover:text-amber-400 transition-colors truncate block"
                  >
                    {blog.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-white/40">{blog.author?.name || blog.author?.email || 'Author'}</span>
                    {blog.category && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span className="text-xs text-white/40">{blog.category.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    blog.status === 'PUBLISHED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : blog.status === 'SCHEDULED'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        : 'bg-white/[0.06] text-white/40 border border-white/[0.08]'
                  }`}>
                    {blog.status}
                  </span>
                  <span className="text-xs text-white/30">{formatDate(blog.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-sm text-white/40">No blogs created yet</p>
            <Link
              href="/admin/blogs/new"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Create your first blog →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
