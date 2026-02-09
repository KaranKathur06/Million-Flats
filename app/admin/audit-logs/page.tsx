import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Faudit-logs')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    redirect('/user/dashboard?error=admin_only')
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
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-serif font-bold">Audit Logs</h1>
          <Link href="/admin" className="text-sm font-semibold text-white/80 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
          <input
            name="entityType"
            defaultValue={entityType}
            placeholder="Entity type (MANUAL_PROPERTY / AGENT / USER)"
            className="h-11 w-full md:w-[320px] rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/40"
          />
          <input
            name="action"
            defaultValue={action}
            placeholder="Action"
            className="h-11 w-full md:w-[280px] rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/40"
          />
          <button className="h-11 rounded-xl bg-amber-400 text-[#0b1220] font-semibold px-6 hover:bg-amber-300">Apply</button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-white/70 border-b border-white/10">
                <th className="py-3 pr-4">Time</th>
                <th className="py-3 pr-4">Entity</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Performed By</th>
                <th className="py-3 pr-4">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={String(r.id)} className="border-b border-white/5 align-top">
                  <td className="py-4 pr-4 text-white/70 whitespace-nowrap">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-white font-semibold">{safeString(r.entityType)}</div>
                    <div className="text-xs text-white/60 break-all">{safeString(r.entityId)}</div>
                  </td>
                  <td className="py-4 pr-4 text-white/90">{safeString(r.action)}</td>
                  <td className="py-4 pr-4 text-white/80">
                    {safeString(r.performedBy?.name) || safeString(r.performedBy?.email) || '—'}
                  </td>
                  <td className="py-4 pr-4 text-xs text-white/70">
                    <pre className="max-w-[520px] whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/10 p-3">
                      {JSON.stringify(r.meta ?? null, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-white/60">
                    No audit logs found.
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
