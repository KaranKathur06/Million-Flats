import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/auth/login?next=%2Fadmin%2Freports')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const reports = await (prisma as any).report
    .findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { moderationCase: { select: { id: true, queue: true, currentRiskScore: true } } },
    })
    .catch(() => [])

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Governance
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Open Reports</h1>
          <p className="mt-1 text-[14px] text-white/50">User-submitted reports linked to cases.</p>
        </div>
        <Link href="/admin" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {(Array.isArray(reports) ? reports : []).map((r: any) => (
          <div key={r.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-white/90 text-[13px]">{safeString(r.entityType) || '—'}</div>
                <div className="mt-1 text-[11px] text-white/35 break-all">{safeString(r.entityId) || '—'}</div>
              </div>
              <div className="text-[10px] text-white/35">{safeString(r.createdAt) ? new Date(r.createdAt).toLocaleString() : '-'}</div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Queue</div>
                <div className="mt-0.5 text-[13px] font-semibold text-white/80">{safeString(r?.moderationCase?.queue) || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Risk</div>
                <div className="mt-0.5 text-[13px] font-semibold text-white/80">{Number(r?.moderationCase?.currentRiskScore || 0)}</div>
              </div>
            </div>

            <div className="mt-3 text-[12px] text-white/55 whitespace-pre-wrap">{safeString(r.reason) || '-'}</div>

            <div className="mt-4">
              {r?.moderationCase?.id ? (
                <Link
                  href={`/admin/governance/cases/${String(r.moderationCase.id)}`}
                  className="inline-flex items-center justify-center h-8 px-3.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[12px] font-semibold text-white/70 hover:text-white transition-all border border-white/[0.06]"
                >
                  Review
                </Link>
              ) : (
                <span className="text-white/25 text-[12px]">—</span>
              )}
            </div>
          </div>
        ))}

        {(Array.isArray(reports) ? reports.length : 0) === 0 ? (
          <div className="py-12 text-center text-white/30 text-[13px]">No open reports.</div>
        ) : null}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Entity</th>
              <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Queue</th>
              <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Risk</th>
              <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Reason</th>
              <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">Created</th>
              <th className="py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(reports) ? reports : []).map((r: any) => (
              <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="py-4">
                  <div className="font-semibold text-white/90">{safeString(r.entityType)}</div>
                  <div className="text-[11px] text-white/35 break-all mt-0.5">{safeString(r.entityId)}</div>
                </td>
                <td className="py-4 text-white/65">{safeString(r?.moderationCase?.queue) || '-'}</td>
                <td className="py-4 text-white/65">{Number(r?.moderationCase?.currentRiskScore || 0)}</td>
                <td className="py-4 text-white/55 whitespace-pre-wrap max-w-[300px]">{safeString(r.reason)}</td>
                <td className="py-4 text-white/45 text-[12px]">{safeString(r.createdAt) ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                <td className="py-4">
                  {r?.moderationCase?.id ? (
                    <Link
                      href={`/admin/governance/cases/${String(r.moderationCase.id)}`}
                      className="inline-flex items-center justify-center h-8 px-3.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[12px] font-semibold text-white/70 hover:text-white transition-all border border-white/[0.06]"
                    >
                      Review
                    </Link>
                  ) : (
                    <span className="text-white/25">—</span>
                  )}
                </td>
              </tr>
            ))}

            {(Array.isArray(reports) ? reports.length : 0) === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-white/30 text-[13px]">
                  No open reports.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
