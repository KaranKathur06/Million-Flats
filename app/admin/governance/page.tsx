import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { prisma } from '@/lib/prisma'
import FormSelect from '@/components/FormSelect'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminGovernancePage({
  searchParams,
}: {
  searchParams?: {
    entityType?: string
    status?: string
    queue?: string
    minRisk?: string
    from?: string
    to?: string
    page?: string
    pageSize?: string
  }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/auth/login?next=%2Fadmin%2Fgovernance')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const entityType = safeString(searchParams?.entityType) || ''
  const status = safeString(searchParams?.status) || 'OPEN'
  const queue = safeString(searchParams?.queue) || ''
  const minRiskRaw = safeString(searchParams?.minRisk) || ''
  const fromRaw = safeString(searchParams?.from) || ''
  const toRaw = safeString(searchParams?.to) || ''
  const page = safeString(searchParams?.page) || '1'
  const pageSize = safeString(searchParams?.pageSize) || '25'

  const pageNum = Math.max(1, Number(page) || 1)
  const pageSizeNum = Math.min(100, Math.max(5, Number(pageSize) || 25))
  const minRisk = Number.isFinite(Number(minRiskRaw)) ? Number(minRiskRaw) : NaN

  const fromDate = fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : null
  const toDate = toRaw ? new Date(`${toRaw}T23:59:59.999Z`) : null
  const hasValidFrom = Boolean(fromDate && !Number.isNaN(fromDate.getTime()))
  const hasValidTo = Boolean(toDate && !Number.isNaN(toDate.getTime()))

  const where: any = {}
  if (entityType) where.entityType = entityType
  if (status) where.status = status
  if (queue) where.queue = queue
  if (Number.isFinite(minRisk)) where.currentRiskScore = { gte: Math.floor(minRisk) }
  if (hasValidFrom || hasValidTo) {
    where.updatedAt = {
      ...(hasValidFrom ? { gte: fromDate } : null),
      ...(hasValidTo ? { lte: toDate } : null),
    }
  }

  const [cases, totalCount, metrics, openReports, recentActions] = await Promise.all([
    (prisma as any).moderationCase
      .findMany({
        where,
        orderBy: [{ currentRiskScore: 'desc' }, { updatedAt: 'desc' }],
        take: pageSizeNum,
        skip: (pageNum - 1) * pageSizeNum,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          status: true,
          queue: true,
          currentRiskScore: true,
          currentRiskEngineVersion: true,
          updatedAt: true,
          actions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, decision: true, createdAt: true, riskEngineVersion: true },
          },
        },
      })
      .catch(() => []),

    (prisma as any).moderationCase.count({ where }).catch(() => 0),

    Promise.all([
      (prisma as any).moderationCase.count({ where: { status: 'OPEN' } }).catch(() => 0),
      (prisma as any).moderationCase.count({ where: { status: 'OPEN', queue: 'HIGH_RISK' } }).catch(() => 0),
      (prisma as any).moderationCase.count({ where: { status: 'OPEN', queue: 'ESCALATED' } }).catch(() => 0),
    ]),

    (prisma as any).report.count({ where: { status: 'OPEN' } }).catch(() => 0),

    (prisma as any).moderationAction
      .findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          decision: true,
          note: true,
          riskScoreSnapshot: true,
          riskEngineVersion: true,
          createdAt: true,
          moderationCase: { select: { id: true, entityType: true, entityId: true, queue: true } },
          actorUser: { select: { id: true, name: true, email: true, role: true } },
        },
      })
      .catch(() => []),
  ])

  const [openCases, highRiskOpen, escalatedOpen] = metrics
  const totalPages = Math.max(1, Math.ceil(Number(totalCount || 0) / pageSizeNum))
  const canPrev = pageNum > 1
  const canNext = pageNum < totalPages

  const baseFilters = new URLSearchParams()
  if (entityType) baseFilters.set('entityType', entityType)
  if (status) baseFilters.set('status', status)
  if (queue) baseFilters.set('queue', queue)
  if (minRiskRaw) baseFilters.set('minRisk', minRiskRaw)
  if (fromRaw) baseFilters.set('from', fromRaw)
  if (toRaw) baseFilters.set('to', toRaw)
  baseFilters.set('pageSize', String(pageSizeNum))

  const prevQs = new URLSearchParams(baseFilters)
  prevQs.set('page', String(Math.max(1, pageNum - 1)))
  const nextQs = new URLSearchParams(baseFilters)
  nextQs.set('page', String(Math.min(totalPages, pageNum + 1)))

  const statCards = [
    { label: 'Open Cases', value: Number(openCases || 0), color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/15', text: 'text-blue-300', icon: '📋' },
    { label: 'High Risk (open)', value: Number(highRiskOpen || 0), color: 'from-amber-400/20 to-amber-500/5', border: 'border-amber-400/20', text: 'text-amber-300', icon: '⚠️' },
    { label: 'Escalated (open)', value: Number(escalatedOpen || 0), color: 'from-rose-500/20 to-rose-600/5', border: 'border-rose-500/15', text: 'text-rose-300', icon: '🚨' },
    { label: 'Open Reports', value: Number(openReports || 0), color: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/15', text: 'text-violet-300', icon: '📢' },
  ]

  const quickFilters = [
    { href: '/admin/governance?status=OPEN', label: 'Open', active: status === 'OPEN' && !queue && !entityType },
    { href: '/admin/governance?status=CLOSED', label: 'Closed', active: status === 'CLOSED' && !queue && !entityType },
    { href: '/admin/governance?status=OPEN&queue=HIGH_RISK', label: 'High Risk', active: queue === 'HIGH_RISK', accent: true },
    { href: '/admin/governance?status=OPEN&entityType=MANUAL_PROPERTY', label: 'Manual Properties', active: entityType === 'MANUAL_PROPERTY' && !queue },
    { href: '/admin/governance?status=OPEN&entityType=AGENT', label: 'Agents', active: entityType === 'AGENT' && !queue },
  ]

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Governance
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Moderation Queue</h1>
        <p className="mt-1 text-[14px] text-white/50">Sorted by risk score. Decisions are snapshot-versioned.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`group relative overflow-hidden rounded-2xl border ${s.border} bg-gradient-to-br ${s.color} p-5 transition-all duration-300 hover:scale-[1.02]`}
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

      {/* Filter form */}
      <form method="get" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-1.5">Status</label>
            <FormSelect
              name="status"
              defaultValue={status}
              options={[
                { value: 'OPEN', label: 'OPEN' },
                { value: 'CLOSED', label: 'CLOSED' },
              ]}
              dense
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-1.5">Entity Type</label>
            <FormSelect
              name="entityType"
              defaultValue={entityType}
              options={[
                { value: '', label: 'All entity types' },
                { value: 'MANUAL_PROPERTY', label: 'MANUAL_PROPERTY' },
                { value: 'AGENT', label: 'AGENT' },
                { value: 'USER', label: 'USER' },
                { value: 'ECOSYSTEM_PARTNER', label: 'ECOSYSTEM_PARTNER' },
                { value: 'ECOSYSTEM_PARTNER_APPLICATION', label: 'ECOSYSTEM_PARTNER_APPLICATION' },
              ]}
              dense
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-1.5">Queue</label>
            <FormSelect
              name="queue"
              defaultValue={queue}
              options={[
                { value: '', label: 'All queues' },
                { value: 'NORMAL', label: 'NORMAL' },
                { value: 'HIGH_RISK', label: 'HIGH_RISK' },
                { value: 'ESCALATED', label: 'ESCALATED' },
              ]}
              dense
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Min Risk</label>
            <input
              name="minRisk"
              defaultValue={minRiskRaw}
              placeholder="0"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">From</label>
            <input
              type="date"
              name="from"
              defaultValue={fromRaw}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40 [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">To</label>
            <input
              type="date"
              name="to"
              defaultValue={toRaw}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40 [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="space-y-1.5 w-[120px]">
              <FormSelect
                name="pageSize"
                defaultValue={String(pageSizeNum)}
                options={[
                  { value: '10', label: '10 / page' },
                  { value: '25', label: '25 / page' },
                  { value: '50', label: '50 / page' },
                  { value: '100', label: '100 / page' },
                ]}
                dense
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[13px] text-[#0b1220] font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 transition-all duration-200"
            >
              Apply Filters
            </button>

            <Link
              href="/admin/governance"
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] text-white/60 font-semibold hover:bg-white/[0.07] hover:text-white/90 hover:border-white/[0.15] transition-all duration-200"
            >
              Reset
            </Link>
          </div>

          <div className="text-[12px] text-white/40 font-medium">
            Page {pageNum} of {totalPages} · {Number(totalCount || 0)} total
          </div>
        </div>
      </form>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`inline-flex items-center h-8 px-3.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${f.active
                ? f.accent
                  ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                  : 'bg-white/[0.08] text-white border border-white/[0.12]'
                : f.accent
                  ? 'border border-amber-400/15 text-amber-300/70 hover:bg-amber-400/10 hover:text-amber-300'
                  : 'border border-white/[0.06] text-white/45 hover:bg-white/[0.04] hover:text-white/75'
              }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Queue + Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Queue table */}
        <div className="xl:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-white/90">Queue</h2>
              <p className="mt-0.5 text-[11px] text-white/35">Sorted by risk score desc, then updatedAt desc</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                aria-disabled={!canPrev}
                href={canPrev ? `/admin/governance?${prevQs.toString()}` : '#'}
                className={`inline-flex items-center justify-center h-8 px-3 rounded-lg text-[12px] font-semibold transition-all duration-200 ${canPrev
                    ? 'border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white'
                    : 'border border-white/[0.04] bg-white/[0.02] text-white/20 cursor-not-allowed'
                  }`}
              >
                ← Prev
              </Link>
              <Link
                aria-disabled={!canNext}
                href={canNext ? `/admin/governance?${nextQs.toString()}` : '#'}
                className={`inline-flex items-center justify-center h-8 px-3 rounded-lg text-[12px] font-semibold transition-all duration-200 ${canNext
                    ? 'border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white'
                    : 'border border-white/[0.04] bg-white/[0.02] text-white/20 cursor-not-allowed'
                  }`}
              >
                Next →
              </Link>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Entity</th>
                  <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Queue</th>
                  <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Risk</th>
                  <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Last Action</th>
                  <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Updated</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(cases) ? cases : []).map((c: any) => (
                  <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-4">
                      <div className="font-semibold text-white/90 text-[13px]">{String(c.entityType)}</div>
                      <div className="text-white/35 text-[11px] break-all mt-0.5">{String(c.entityId)}</div>
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-semibold ${String(c.queue) === 'HIGH_RISK'
                            ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                            : String(c.queue) === 'ESCALATED'
                              ? 'bg-rose-400/10 text-rose-300 border border-rose-400/20'
                              : 'bg-white/[0.04] text-white/60 border border-white/[0.06]'
                          }`}
                      >
                        {String(c.queue)}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-white/90">{Number(c.currentRiskScore || 0)}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">v{safeString(c.currentRiskEngineVersion) || '-'}</div>
                    </td>
                    <td className="py-4">
                      <div className="text-white/65">{safeString(c?.actions?.[0]?.decision) || '-'}</div>
                    </td>
                    <td className="py-4 text-white/45 text-[12px]">{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '-'}</td>
                    <td className="py-4">
                      <Link
                        href={`/admin/governance/cases/${c.id}`}
                        className="inline-flex items-center justify-center h-8 px-3.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[12px] font-semibold text-white/70 hover:text-white transition-all duration-200 border border-white/[0.06] hover:border-white/[0.1]"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}

                {(Array.isArray(cases) ? cases.length : 0) === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="text-white/30 text-[13px]">No cases found.</div>
                      <p className="mt-1 text-white/20 text-[12px]">Try adjusting your filters above.</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-[15px] font-bold text-white/90">Activity Feed</h2>
          <p className="mt-0.5 text-[11px] text-white/35">Source: ModerationAction</p>

          <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {(Array.isArray(recentActions) ? recentActions : []).map((a: any) => (
              <div key={a.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white/80 text-[13px]">{safeString(a.decision)}</div>
                  <div className="text-[10px] text-white/30 whitespace-nowrap">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
                </div>

                <div className="mt-1.5 text-[11px] text-white/35 break-all">
                  {safeString(a?.moderationCase?.entityType)} {safeString(a?.moderationCase?.entityId)}
                </div>

                <div className="mt-1 text-[10px] text-white/25">
                  risk={Number(a.riskScoreSnapshot || 0)} v{safeString(a.riskEngineVersion) || '-'}
                </div>

                {a.note ? <div className="mt-2 text-[12px] text-white/55 whitespace-pre-wrap">{String(a.note)}</div> : null}

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-white/30">
                    {safeString(a?.actorUser?.name) || safeString(a?.actorUser?.email) || 'System'}
                  </div>
                  {a?.moderationCase?.id ? (
                    <Link
                      href={`/admin/governance/cases/${String(a.moderationCase.id)}`}
                      className="text-[11px] font-semibold text-amber-300/80 hover:text-amber-300 transition-colors"
                    >
                      View case →
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}

            {(Array.isArray(recentActions) ? recentActions.length : 0) === 0 ? (
              <div className="py-8 text-center text-white/30 text-[13px]">No recent governance actions.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
