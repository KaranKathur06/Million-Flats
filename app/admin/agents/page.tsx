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

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fagents')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const statusFilter = safeString(searchParams?.status) || ''

  const where: any = { agent: { isNot: null } }

  const rows = await (prisma as any).user.findMany({
    where,
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
          verificationStatus: true,
          riskScore: true,
          createdAt: true,
          documents: {
            select: { id: true, status: true },
          },
          verifications: {
            select: { id: true, status: true },
          },
          verificationProgress: {
            select: { completionPercentage: true },
          },
          subscription: {
            select: {
              id: true,
              plan: true,
              status: true,
              startDate: true,
              endDate: true,
              trialEndsAt: true,
            },
          },
        },
      },
    },
  })

  const items = (rows as any[]).map((u) => {
    const agent = u.agent
    const allDocs = [
      ...(agent?.documents || []),
      ...(agent?.verifications || []),
    ]
    const totalDocs = allDocs.length
    const approvedDocs = allDocs.filter((d: any) => String(d.status).toUpperCase() === 'APPROVED').length

    // Calculate days remaining for subscription
    const subscription = agent?.subscription
    let daysRemaining: number | null = null
    if (subscription?.endDate) {
      const now = new Date()
      const end = new Date(subscription.endDate)
      const diff = end.getTime() - now.getTime()
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

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
      verificationStatus: safeString(agent?.verificationStatus || 'PENDING'),
      riskScore: typeof agent?.riskScore === 'number' ? agent.riskScore : 0,
      totalDocs,
      approvedDocs,
      completionPercentage: agent?.verificationProgress?.completionPercentage ?? agent?.profileCompletion ?? 0,
      // Subscription fields
      subscriptionPlan: safeString(subscription?.plan),
      subscriptionStatus: safeString(subscription?.status),
      subscriptionEndDate: subscription?.endDate,
      subscriptionDaysRemaining: daysRemaining,
    }
  })

  // Filter by verification status if filter is set
  const filtered = statusFilter
    ? items.filter((i) => i.verificationStatus.toUpperCase() === statusFilter.toUpperCase())
    : items

  // Count by status for filter badges
  const statusCounts: Record<string, number> = {}
  for (const i of items) {
    const s = i.verificationStatus.toUpperCase() || 'PENDING'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Admin
            </span>
            <span className="inline-flex h-6 items-center rounded-md bg-blue-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Verification Queue
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Agent Verification</h1>
          <p className="mt-1 text-sm text-white/50">Review and manage agent verification requests</p>
        </div>
        <Link href="/admin" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: '', },
          { label: 'Pending', value: 'PENDING' },
          { label: 'Submitted', value: 'SUBMITTED' },
          { label: 'Under Review', value: 'UNDER_REVIEW' },
          { label: 'Approved', value: 'APPROVED' },
          { label: 'Rejected', value: 'REJECTED' },
          { label: 'Flagged', value: 'FLAGGED' },
        ].map((tab) => {
          const isActive = statusFilter.toUpperCase() === tab.value
          const count = tab.value ? (statusCounts[tab.value] || 0) : items.length
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/agents?status=${tab.value}` : '/admin/agents'}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200 border ${isActive
                ? 'bg-gradient-to-r from-amber-400/15 to-amber-400/5 text-white border-amber-400/20'
                : 'bg-white/[0.02] text-white/50 border-white/[0.06] hover:bg-white/[0.04] hover:text-white/70'
                }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-white/[0.06] text-white/40'}`}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <AdminAgentsTableClient items={filtered} currentRole={role} />
      </div>
    </div>
  )
}
