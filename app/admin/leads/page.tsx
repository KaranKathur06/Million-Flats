import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminLeadsClient from './AdminLeadsClient'

export default async function AdminLeadsPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fleads')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const projects = await prisma.project
    .findMany({
      where: { status: 'PUBLISHED', isDeleted: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
      take: 500,
    })
    .catch(() => [])

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            CRM
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-white/50 max-w-xl">
            Single source of truth — all contact, project, and ecosystem submissions flow into one table.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 mt-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/leads/health"
            className="text-[11px] text-white/35 hover:text-amber-300/80"
          >
            Diagnostics
          </Link>
        </div>
      </div>

      <Suspense fallback={<p className="text-sm text-white/50">Loading leads…</p>}>
        <AdminLeadsClient currentRole={role} projects={projects} />
      </Suspense>
    </div>
  )
}
