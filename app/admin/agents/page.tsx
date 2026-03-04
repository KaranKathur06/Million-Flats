import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminAgentsTableClient from './AdminAgentsTableClient'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminAgentsPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fagents')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const rows = await (prisma as any).user.findMany({
    where: { agent: { isNot: null } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      verified: true,
      role: true,
      status: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          company: true,
          license: true,
          whatsapp: true,
          approved: true,
          profileStatus: true,
          profileCompletion: true,
          createdAt: true,
        },
      },
    },
  })

  const items = (rows as any[]).map((u) => {
    const agent = u.agent
    return {
      userId: String(u.id),
      agentId: safeString(agent?.id),
      name: safeString(u.name) || safeString(u.email) || 'Agent',
      email: safeString(u.email),
      phone: safeString(u.phone),
      verified: Boolean(u.verified),
      role: safeString(u.role),
      status: safeString(u.status),
      createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : '',
      company: safeString(agent?.company),
      license: safeString(agent?.license),
      whatsapp: safeString(agent?.whatsapp),
      approved: Boolean(agent?.approved),
      profileStatus: safeString(agent?.profileStatus),
      profileCompletion: typeof agent?.profileCompletion === 'number' ? agent.profileCompletion : 0,
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Agents</h1>
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
        <AdminAgentsTableClient items={items} currentRole={role} />
      </div>
    </div>
  )
}
