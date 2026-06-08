import Link from 'next/link'
import type { OperationsDashboardData } from '@/lib/admin/operationsDashboard'
import AdminKpiCard from '@/components/admin/workspace/AdminKpiCard'
import AdminTrendBars from '@/components/admin/workspace/AdminTrendBars'

type Props = {
  data: OperationsDashboardData
}

export default function AdminOperationsDashboard({ data }: Props) {
  const { kpis, leadTrend, countryTrend, threeDTourPipeline, recentLeads, recentActivity, listingStats } = data

  return (
    <div className="w-full space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Operations
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Operations Center</h1>
        <p className="mt-1 text-[14px] text-white/50">
          Listings, CRM, projects, agents, and 3D tour pipeline — unified workspace overview.
        </p>
      </div>

      {/* Primary KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <AdminKpiCard label="Listings" value={kpis.listingsTotal} sublabel={`${kpis.listingsPending} pending review`} href="/admin/listings" accent="blue" />
        <AdminKpiCard label="Leads" value={kpis.leadsTotal} sublabel={`${kpis.leadsWeek} this week`} href="/admin/leads" accent="emerald" />
        <AdminKpiCard label="Agents" value={kpis.agentsTotal} href="/admin/agents" accent="violet" />
        <AdminKpiCard label="Projects live" value={kpis.projectsPublished} sublabel={`${kpis.projectsDraft} drafts`} href="/admin/projects" accent="amber" />
        <AdminKpiCard
          label="3D tours"
          value={kpis.threeDTourWeek}
          sublabel={`${kpis.threeDTourOpen} open in pipeline`}
          href="/admin/leads?leadType=THREE_D_TOUR"
          accent="orange"
        />
      </div>

      {/* Middle: activity + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40">Recent leads</h2>
              <Link href="/admin/leads" className="text-[12px] font-semibold text-amber-400/90 hover:text-amber-300">
                View all →
              </Link>
            </div>
            {recentLeads.length === 0 ? (
              <p className="text-sm text-white/40">No leads yet.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {recentLeads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-white/90 truncate">{lead.name}</p>
                      <p className="text-xs text-white/45 truncate">
                        {String(lead.leadType).replace(/_/g, ' ')} · {lead.email}
                        {lead.propertyName ? ` · ${lead.propertyName}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] rounded-full border border-white/10 px-2 py-0.5 text-white/60">
                        {lead.status}
                      </span>
                      <p className="text-[10px] text-white/35 mt-1">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40 mb-4">Recent activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-white/40">No audit events yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-white/80">
                        <span className="font-semibold text-amber-200/90">{a.action}</span>
                        {' · '}
                        {a.entityType}
                      </p>
                      <p className="text-[11px] text-white/40 truncate">
                        {a.performerName || 'System'} · {a.entityId.slice(0, 12)}…
                      </p>
                    </div>
                    <time className="shrink-0 text-[10px] text-white/35">
                      {new Date(a.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">Pending moderation</p>
            <ul className="mt-3 space-y-2 text-sm">
              {listingStats.pending > 0 ? (
                <li>
                  <Link href="/admin/governance?entityType=MANUAL_PROPERTY" className="text-amber-200 hover:underline">
                    {listingStats.pending} listing{listingStats.pending === 1 ? '' : 's'} pending review
                  </Link>
                </li>
              ) : (
                <li className="text-white/45">No pending listings</li>
              )}
              {listingStats.drafts > 0 ? (
                <li>
                  <Link href="/admin/drafts" className="text-white/70 hover:text-white hover:underline">
                    {listingStats.drafts} draft listing{listingStats.drafts === 1 ? '' : 's'}
                  </Link>
                </li>
              ) : null}
              {kpis.threeDTourOpen > 0 ? (
                <li>
                  <Link href="/admin/leads?leadType=THREE_D_TOUR" className="text-orange-200 hover:underline">
                    {kpis.threeDTourOpen} active 3D tour inquiry{kpis.threeDTourOpen === 1 ? '' : 'ies'}
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3">3D tour pipeline</p>
            {threeDTourPipeline.length === 0 ? (
              <p className="text-sm text-white/40">No 3D tour leads yet.</p>
            ) : (
              <ul className="space-y-2">
                {threeDTourPipeline.slice(0, 6).map((row) => (
                  <li key={row.status} className="flex items-center justify-between text-xs">
                    <span className="text-white/60">{row.status.replace(/_/g, ' ')}</span>
                    <span className="font-bold tabular-nums text-orange-200">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3">Listing breakdown</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] p-3">
                <p className="text-white/40">Published</p>
                <p className="text-lg font-bold text-emerald-300 tabular-nums">{listingStats.approved}</p>
              </div>
              <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.04] p-3">
                <p className="text-white/40">Pending</p>
                <p className="text-lg font-bold text-amber-300 tabular-nums">{listingStats.pending}</p>
              </div>
              <div className="rounded-lg border border-white/[0.06] p-3">
                <p className="text-white/40">Drafts</p>
                <p className="text-lg font-bold text-white/70 tabular-nums">{listingStats.drafts}</p>
              </div>
              <div className="rounded-lg border border-rose-500/15 bg-rose-500/[0.04] p-3">
                <p className="text-white/40">Rejected</p>
                <p className="text-lg font-bold text-rose-300 tabular-nums">{listingStats.rejected}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminTrendBars title="Lead trend (7 days)" points={leadTrend} />
        <AdminTrendBars title="Leads by country" points={countryTrend} maxBars={5} emptyLabel="No country data" />
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {[
            { href: '/admin/governance?entityType=MANUAL_PROPERTY', label: 'Moderation Queue', primary: true },
            { href: '/admin/leads', label: 'CRM / Leads' },
            { href: '/admin/leads?leadType=THREE_D_TOUR', label: '3D Tour Pipeline' },
            { href: '/admin/projects', label: 'Projects' },
            { href: '/admin/listings', label: 'Listings' },
            { href: '/admin/agents', label: 'Agents' },
            { href: '/admin/users', label: 'Users' },
            { href: '/admin/blogs', label: 'Blogs' },
            { href: '/admin/reports', label: 'Reports' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center justify-center h-10 px-5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                link.primary
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400'
                  : 'border border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
