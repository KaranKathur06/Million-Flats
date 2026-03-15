import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminBlogsTableClient from '../AdminBlogsTableClient'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminBlogsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fblogs')
  }

  if (!hasMinRole(role as any, 'ADMIN' as any) && !hasMinRole(role as any, 'EDITOR' as any)) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const status = safeString(searchParams?.status) || ''
  const author = safeString(searchParams?.author)
  const category = safeString(searchParams?.category)
  const search = safeString(searchParams?.search)

  const where: any = {}
  if (status) where.status = status.toUpperCase()
  if (author) where.authorId = author
  if (category) where.categoryId = category
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
      { metaTitle: { contains: search, mode: 'insensitive' } },
      { metaDescription: { contains: search, mode: 'insensitive' } },
    ]
  }

  const rows = await (prisma as any).blog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  })

  const items = (rows as any[]).map((b: any) => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    authorName: b.author?.name || b.author?.email || 'Author',
    authorEmail: b.author?.email || '',
    categoryName: b.category?.name || '—',
    seoScore: b.seoScore,
    status: b.status,
    publishAt: b.publishAt,
    createdAt: b.createdAt,
    views: b.views,
    tags: (b.tags as any[]).map((t: any) => t.tag?.name).filter(Boolean) as string[],
  }))

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Admin
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Blog Management</h1>
          <p className="mt-1 text-sm text-white/50">Create, edit, and manage blog posts</p>
        </div>
        <Link
          href="/admin"
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: '' },
          { label: 'Draft', value: 'DRAFT' },
          { label: 'Published', value: 'PUBLISHED' },
          { label: 'Scheduled', value: 'SCHEDULED' },
        ].map((tab) => {
          const isActive = status.toUpperCase() === tab.value
          const count = tab.value
            ? items.filter((i: any) => i.status.toUpperCase() === tab.value).length
            : items.length
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/blogs?status=${tab.value}` : '/admin/blogs'}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200 border ${
                isActive
                  ? 'bg-gradient-to-r from-amber-400/15 to-amber-400/5 text-white border-amber-400/20'
                  : 'bg-white/[0.02] text-white/50 border-white/[0.06] hover:bg-white/[0.04] hover:text-white/70'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-white/[0.06] text-white/40'
                }`}
              >
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex justify-end mb-6">
        <Link
          href="/admin/blogs/new"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Blog
        </Link>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <AdminBlogsTableClient items={items} currentRole={role} />
      </div>
    </div>
  )
}