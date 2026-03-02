import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { prisma } from '@/lib/prisma'

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

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Governance</p>
        <h1 className="mt-2 text-3xl font-serif font-bold">Moderation Queue</h1>
        <p className="mt-2 text-white/60">Sorted by risk score. Decisions are snapshot-versioned.</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Open cases</p>
            <p className="mt-2 text-2xl font-bold text-white">{Number(openCases || 0)}</p>
          </div>
          <div className="rounded-2xl border border-amber-300/30 bg-black/10 p-5">
            <p className="text-xs text-white/60">High risk (open)</p>
            <p className="mt-2 text-2xl font-bold text-amber-200">{Number(highRiskOpen || 0)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Escalated (open)</p>
            <p className="mt-2 text-2xl font-bold text-white">{Number(escalatedOpen || 0)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Open reports</p>
            <p className="mt-2 text-2xl font-bold text-white">{Number(openReports || 0)}</p>
          </div>
        </div>

        <form method="get" className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-5">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
            >
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>

            <select
              name="entityType"
              defaultValue={entityType}
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
            >
              <option value="">All entity types</option>
              <option value="MANUAL_PROPERTY">MANUAL_PROPERTY</option>
              <option value="AGENT">AGENT</option>
              <option value="USER">USER</option>
              <option value="ECOSYSTEM_PARTNER">ECOSYSTEM_PARTNER</option>
              <option value="ECOSYSTEM_PARTNER_APPLICATION">ECOSYSTEM_PARTNER_APPLICATION</option>
            </select>

            <select
              name="queue"
              defaultValue={queue}
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
            >
              <option value="">All queues</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH_RISK">HIGH_RISK</option>
              <option value="ESCALATED">ESCALATED</option>
            </select>

            <input
              name="minRisk"
              defaultValue={minRiskRaw}
              placeholder="Min risk"
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-4 text-sm text-white placeholder:text-white/30"
            />

            <input
              type="date"
              name="from"
              defaultValue={fromRaw}
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
            />

            <input
              type="date"
              name="to"
              defaultValue={toRaw}
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                name="pageSize"
                defaultValue={String(pageSizeNum)}
                className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>

              <button
                type="submit"
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-amber-400 text-[#0b1220] font-semibold hover:bg-amber-300"
              >
                Apply
              </button>

              <Link
                href="/admin/governance"
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5"
              >
                Reset
              </Link>
            </div>

            <div className="text-sm text-white/60">
              Showing page {pageNum} / {totalPages} (total {Number(totalCount || 0)})
            </div>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/admin/governance?status=OPEN" className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold">
            Open
          </Link>
          <Link href="/admin/governance?status=CLOSED" className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold">
            Closed
          </Link>
          <Link
            href="/admin/governance?status=OPEN&queue=HIGH_RISK"
            className="h-9 px-4 rounded-xl border border-amber-300/30 text-amber-200 hover:bg-white/5 text-sm font-semibold"
          >
            High Risk
          </Link>
          <Link
            href="/admin/governance?status=OPEN&entityType=MANUAL_PROPERTY"
            className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold"
          >
            Manual Properties
          </Link>
          <Link
            href="/admin/governance?status=OPEN&entityType=AGENT"
            className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold"
          >
            Agents
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-black/10 p-5">
            <h2 className="text-lg font-bold">Queue</h2>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-white/50">Sorted by risk score desc, then updatedAt desc</div>
              <div className="flex items-center gap-2">
                <Link
                  aria-disabled={!canPrev}
                  href={canPrev ? `/admin/governance?${prevQs.toString()}` : '#'}
                  className={`inline-flex items-center justify-center h-9 px-4 rounded-xl text-sm font-semibold border ${
                    canPrev ? 'border-white/10 bg-white/10 hover:bg-white/15 text-white' : 'border-white/10 bg-white/5 text-white/40 cursor-not-allowed'
                  }`}
                >
                  Prev
                </Link>
                <Link
                  aria-disabled={!canNext}
                  href={canNext ? `/admin/governance?${nextQs.toString()}` : '#'}
                  className={`inline-flex items-center justify-center h-9 px-4 rounded-xl text-sm font-semibold border ${
                    canNext ? 'border-white/10 bg-white/10 hover:bg-white/15 text-white' : 'border-white/10 bg-white/5 text-white/40 cursor-not-allowed'
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-white/60">
                    <th className="py-3">Entity</th>
                    <th className="py-3">Queue</th>
                    <th className="py-3">Risk</th>
                    <th className="py-3">Last Action</th>
                    <th className="py-3">Updated</th>
                    <th className="py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(cases) ? cases : []).map((c: any) => (
                    <tr key={c.id} className="border-t border-white/10">
                      <td className="py-4">
                        <div className="font-semibold text-white">{String(c.entityType)}</div>
                        <div className="text-white/50 text-xs break-all">{String(c.entityId)}</div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-semibold border ${
                            String(c.queue) === 'HIGH_RISK'
                              ? 'border-amber-300/30 text-amber-200'
                              : String(c.queue) === 'ESCALATED'
                                ? 'border-red-300/30 text-red-200'
                                : 'border-white/10 text-white/80'
                          }`}
                        >
                          {String(c.queue)}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-white">{Number(c.currentRiskScore || 0)}</div>
                        <div className="text-xs text-white/50">v{safeString(c.currentRiskEngineVersion) || '-'}</div>
                      </td>
                      <td className="py-4">
                        <div className="text-white/80">{safeString(c?.actions?.[0]?.decision) || '-'}</div>
                      </td>
                      <td className="py-4 text-white/60">{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '-'}</td>
                      <td className="py-4">
                        <Link
                          href={`/admin/governance/cases/${c.id}`}
                          className="inline-flex items-center justify-center h-9 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {(Array.isArray(cases) ? cases.length : 0) === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-white/60">
                        No cases found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <h2 className="text-lg font-bold">Activity Feed</h2>
            <p className="mt-1 text-xs text-white/50">Source: ModerationAction</p>

            <div className="mt-4 space-y-2">
              {(Array.isArray(recentActions) ? recentActions : []).map((a: any) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-white/90">{safeString(a.decision)}</div>
                    <div className="text-xs text-white/50">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
                  </div>

                  <div className="mt-1 text-xs text-white/50 break-all">
                    {safeString(a?.moderationCase?.entityType)} {safeString(a?.moderationCase?.entityId)}
                  </div>

                  <div className="mt-1 text-xs text-white/50">
                    risk={Number(a.riskScoreSnapshot || 0)} v{safeString(a.riskEngineVersion) || '-'}
                  </div>

                  {a.note ? <div className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{String(a.note)}</div> : null}

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-xs text-white/50">
                      {safeString(a?.actorUser?.name) || safeString(a?.actorUser?.email) || 'System'}
                    </div>
                    {a?.moderationCase?.id ? (
                      <Link
                        href={`/admin/governance/cases/${String(a.moderationCase.id)}`}
                        className="text-xs font-semibold text-amber-200 hover:underline"
                      >
                        View case
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}

              {(Array.isArray(recentActions) ? recentActions.length : 0) === 0 ? (
                <div className="text-white/60">No recent governance actions.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
