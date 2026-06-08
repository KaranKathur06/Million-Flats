import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { getLeadSyncHealth } from '@/lib/leads/queries'

export default async function AdminLeadsHealthPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fleads%2Fhealth')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const health = await getLeadSyncHealth()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/leads" className="text-sm text-white/50 hover:text-white/80">
          ← Back to Leads
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Leads CRM Diagnostics</h1>
        <p className="mt-1 text-sm text-white/50">Dashboard vs table counts from the single `leads` table.</p>
      </div>

      <div
        className={`rounded-2xl border p-6 ${
          health.inSync ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
        }`}
      >
        <p className="text-lg font-semibold">{health.inSync ? 'In sync' : 'Synchronization error'}</p>
        <p className="mt-1 text-sm text-white/60">
          Difference (dashboard − table): <strong className="text-white">{health.difference}</strong>
          {health.difference !== 0 ? ' — check server logs for Lead Synchronization Error' : ''}
        </p>
      </div>

      <dl className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.06]">
        {[
          ['Total leads', health.totalLeads],
          ['3D Tour leads', health.threeDTourLeads],
          ['Project leads', health.projectLeads],
          ['Contact leads', health.contactLeads],
          ['Ecosystem leads', health.ecosystemLeads],
          ['Lead table count', health.tableCountUnfiltered],
          ['Dashboard count', health.dashboardTotal],
          ['Difference', health.difference],
          ['Last lead created', health.lastLeadCreated || '—'],
          ['Last lead updated', health.lastLeadUpdated || '—'],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between gap-4 px-5 py-3 text-sm">
            <dt className="text-white/50">{label}</dt>
            <dd className="text-white font-mono text-right break-all">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
