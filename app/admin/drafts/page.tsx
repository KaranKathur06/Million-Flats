import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminDraftsTableClient from './AdminDraftsTableClient'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminDraftsPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fdrafts')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const rows = await (prisma as any).manualProperty.findMany({
    where: { sourceType: 'MANUAL', status: 'DRAFT' },
    orderBy: [{ updatedAt: 'desc' }],
    take: 500,
    select: {
      id: true,
      title: true,
      city: true,
      community: true,
      lastCompletedStep: true,
      createdAt: true,
      updatedAt: true,
      agent: { select: { id: true, user: { select: { name: true, email: true } } } },
    },
  })

  const items = (rows as any[]).map((d) => {
    const title = safeString(d?.title) || 'Untitled draft'
    const agentName = safeString(d?.agent?.user?.name) || safeString(d?.agent?.user?.email) || 'Agent'
    const agentEmail = safeString(d?.agent?.user?.email)
    const location = [safeString(d?.community), safeString(d?.city)].filter(Boolean).join(', ') || '—'

    return {
      id: String(d.id),
      title,
      agentName,
      agentEmail,
      location,
      lastCompletedStep: safeString(d?.lastCompletedStep) || '—',
      createdAt: d?.createdAt ? new Date(d.createdAt).toLocaleString() : '',
      updatedAt: d?.updatedAt ? new Date(d.updatedAt).toLocaleString() : '',
    }
  })

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Admin
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Drafts</h1>
        </div>
        <Link href="/admin" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <AdminDraftsTableClient items={items} currentRole={role} />
      </div>
    </div>
  )
}
