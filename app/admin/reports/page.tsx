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
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Governance</p>
        <h1 className="mt-2 text-3xl font-serif font-bold">Open Reports</h1>
        <p className="mt-2 text-white/60">User-submitted reports linked to cases.</p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-white/60">
                <th className="py-3">Entity</th>
                <th className="py-3">Queue</th>
                <th className="py-3">Risk</th>
                <th className="py-3">Reason</th>
                <th className="py-3">Created</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(reports) ? reports : []).map((r: any) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="py-4">
                    <div className="font-semibold">{safeString(r.entityType)}</div>
                    <div className="text-xs text-white/50 break-all">{safeString(r.entityId)}</div>
                  </td>
                  <td className="py-4">{safeString(r?.moderationCase?.queue) || '-'}</td>
                  <td className="py-4">{Number(r?.moderationCase?.currentRiskScore || 0)}</td>
                  <td className="py-4 text-white/70 whitespace-pre-wrap">{safeString(r.reason)}</td>
                  <td className="py-4 text-white/60">{safeString(r.createdAt) ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                  <td className="py-4">
                    {r?.moderationCase?.id ? (
                      <Link
                        href={`/admin/governance/cases/${String(r.moderationCase.id)}`}
                        className="inline-flex items-center justify-center h-9 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold"
                      >
                        Review
                      </Link>
                    ) : (
                      <span className="text-white/40">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {(Array.isArray(reports) ? reports.length : 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-white/60">
                    No open reports.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
