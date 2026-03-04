import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Faudit-logs')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const entityType = safeString(searchParams?.entityType) || ''
  const action = safeString(searchParams?.action) || ''

  const where: any = {}
  if (entityType) where.entityType = entityType.toUpperCase()
  if (action) where.action = action.toUpperCase()

  const rows = await (prisma as any).auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { performedBy: { select: { email: true, name: true } } },
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Audit Logs</h1>
        </div>
        <Link href="/admin" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Filter form */}
      <form className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5" method="get">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Entity Type</label>
            <input
              name="entityType"
              defaultValue={entityType}
              placeholder="MANUAL_PROPERTY / AGENT / USER"
              className="h-10 w-full md:w-[280px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Action</label>
            <input
              name="action"
              defaultValue={action}
              placeholder="Action type"
              className="h-10 w-full md:w-[240px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>
          <button className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[13px] text-[#0b1220] font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 transition-all duration-200">
            Apply
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead>
            <tr className="text-left border-b border-white/[0.06]">
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">Time</th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">Entity</th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">Action</th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">Performed By</th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">Meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={String(r.id)} className="border-b border-white/[0.04] align-top hover:bg-white/[0.02] transition-colors">
                <td className="py-4 pr-4 text-white/55 whitespace-nowrap text-[12px]">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                </td>
                <td className="py-4 pr-4">
                  <div className="text-white/90 font-semibold">{safeString(r.entityType)}</div>
                  <div className="text-[11px] text-white/35 break-all mt-0.5">{safeString(r.entityId)}</div>
                </td>
                <td className="py-4 pr-4 text-white/75">{safeString(r.action)}</td>
                <td className="py-4 pr-4 text-white/65">
                  {safeString(r.performedBy?.name) || safeString(r.performedBy?.email) || '—'}
                </td>
                <td className="py-4 pr-4">
                  <pre className="max-w-[480px] whitespace-pre-wrap break-words rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-white/55">
                    {JSON.stringify(r.meta ?? null, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-white/30 text-[13px]">
                  No audit logs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
