'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CountryFilter, EntityIdentityCell, LifecycleBadge, LifecycleTabs, ManagementEmptyState, ManagementMetricCards } from '@/components/admin/management/ManagementPrimitives'

interface AgencyProfile {
  id: string
  agencyName: string | null
  slug: string | null
  logo: string | null
  country: string | null
  city: string | null
  email: string | null
  user: { email: string; createdAt: string } | null
  onboardingStatus: string
  kycStatus: string
  profileCompletion: number
  linkedAgency: { name: string } | null
}

type Metrics = { total: number; active: number; inactive: number; deleted: number }
const operationTabs = ['ALL', 'ACTIVE', 'INACTIVE', 'DELETED', 'UNDER_REVIEW', 'APPROVED', 'PROFILE_COMPLETED', 'PROFILE_INCOMPLETE', 'REJECTED', 'SUSPENDED']

function buildQuery(status: string, q: string, country: string) {
  const params = new URLSearchParams()
  if (status !== 'ALL') params.set('status', status)
  if (q) params.set('q', q)
  if (country) params.set('country', country)
  return params.toString()
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AgenciesListClient({
  profiles,
  total,
  status,
  page,
  q,
  country,
  metrics,
}: {
  profiles: AgencyProfile[]
  total: number
  status: string
  page: number
  q: string
  country: string
  statusCounts: Record<string, number>
  metrics: Metrics
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [searchQuery, setSearchQuery] = useState(q)
  const limit = 25
  const totalPages = Math.ceil(total / limit)
  const currentStatus = status || 'ALL'

  const navigate = (nextStatus: string, nextPage = 1) => {
    const query = buildQuery(nextStatus, searchQuery, country)
    const pageQuery = nextPage > 1 ? `${query ? `${query}&` : ''}page=${nextPage}` : query
    router.push(`/admin/agencies${pageQuery ? `?${pageQuery}` : ''}`)
  }

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      const sharedActions = ['approve', 'unpublish', 'reject', 'restore', 'delete', 'permanent_delete']
      const response = await fetch(sharedActions.includes(action) ? '/api/admin/bulk-approve' : '/api/admin/agencies/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: sharedActions.includes(action)
          ? JSON.stringify({ entity: 'agencies', action, ids: Array.from(selected) })
          : JSON.stringify({ action, agencyIds: Array.from(selected) }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || result?.success === false) throw new Error(result?.message || result?.error || 'Agency action failed')
      setSelected(new Set())
      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Agency action failed')
    } finally {
      setBusy(false)
    }
  }

  const allSelected = profiles.length > 0 && selected.size === profiles.length

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2"><span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">Agencies</span></div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Agency Management</h1>
          <p className="mt-1 text-sm text-white/40">Lifecycle-safe management for registered agencies and approval workflows.</p>
        </div>
        <Link href="/agency/onboarding" className="inline-flex shrink-0 items-center rounded-xl bg-amber-400/90 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-300">Add Agency</Link>
      </div>

      <ManagementMetricCards metrics={[
        { key: 'total', label: 'Total', value: metrics.total },
        { key: 'active', label: 'Active', value: metrics.active, tone: 'success' },
        { key: 'inactive', label: 'Inactive', value: metrics.inactive, tone: 'warning' },
        { key: 'deleted', label: 'Deleted', value: metrics.deleted, tone: 'danger' },
      ]} />

      <form className="mb-5 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); navigate(currentStatus) }}>
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search agency, slug, email, or city" className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-amber-400/30" />
        <button type="submit" className="rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/[0.12]">Search</button>
      </form>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <LifecycleTabs value={currentStatus} options={operationTabs} onChange={(value) => navigate(value)} />
        <CountryFilter value={country} options={['ALL COUNTRIES', 'UAE', 'INDIA']} onChange={(value) => { const query = buildQuery(currentStatus, searchQuery, value); router.push(`/admin/agencies${query ? `?${query}` : ''}`) }} />
      </div>

      {selected.size > 0 && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4"><span className="text-sm font-semibold text-amber-200/80">{selected.size} agency(s) selected</span><div className="flex flex-wrap gap-2"><button onClick={() => handleBulkAction('approve')} disabled={busy} className="rounded-lg border border-emerald-400/20 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50">Approve &amp; Publish</button><button onClick={() => handleBulkAction('unpublish')} disabled={busy} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 disabled:opacity-50">Unpublish</button><button onClick={() => handleBulkAction('reject')} disabled={busy} className="rounded-lg border border-red-400/20 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Reject</button><button onClick={() => handleBulkAction('suspend')} disabled={busy} className="rounded-lg border border-amber-400/20 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 disabled:opacity-50">Suspend</button><button onClick={() => handleBulkAction('restore')} disabled={busy} className="rounded-lg border border-blue-400/20 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-300 disabled:opacity-50">Restore</button><button onClick={() => handleBulkAction('delete')} disabled={busy} className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Delete</button><button onClick={() => { if (window.confirm('Permanently delete the selected agencies? This cannot be undone.')) handleBulkAction('permanent_delete') }} disabled={busy} className="rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-50">Permanent Delete</button><button onClick={() => setSelected(new Set())} disabled={busy} className="px-3 py-2 text-xs text-white/40 hover:text-white/70">Clear</button></div></div>}

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        {profiles.length === 0 ? <ManagementEmptyState title="No agencies found" detail={q || country || currentStatus !== 'ALL' ? 'No agencies match the current filters.' : 'No agencies have been registered yet.'} action={!q && !country && currentStatus === 'ALL' ? <Link href="/agency/onboarding" className="inline-flex rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-black">Add Agency</Link> : undefined} /> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b border-white/[0.06] bg-white/[0.02]"><th className="w-10 px-4 py-3.5 text-left"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(profiles.map((profile) => profile.id)))} className="h-4 w-4 accent-amber-400" /></th>{['Agency', 'Email', 'Status', 'KYC', 'Completion', 'Linked', 'Joined', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/30">{heading}</th>)}</tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${selected.has(profile.id) ? 'bg-amber-400/[0.04]' : ''}`}><td className="px-4 py-3.5"><input type="checkbox" checked={selected.has(profile.id)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(profile.id) ? next.delete(profile.id) : next.add(profile.id); return next })} className="h-4 w-4 accent-amber-400" /></td><td className="px-5 py-3.5"><EntityIdentityCell name={profile.agencyName || 'Unnamed Agency'} identifier={profile.slug} mediaUrl={profile.logo} fallbackLabel={profile.agencyName || 'A'} /></td><td className="px-5 py-3.5 text-white/60">{profile.user?.email || profile.email || '-'}</td><td className="px-5 py-3.5"><LifecycleBadge status={profile.onboardingStatus} /></td><td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${profile.kycStatus === 'VERIFIED' ? 'bg-emerald-500/15 text-emerald-300' : profile.kycStatus === 'REJECTED' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{profile.kycStatus || 'NOT SUBMITTED'}</span></td><td className="px-5 py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded-full bg-white/[0.08]"><div className={`h-1.5 rounded-full ${profile.profileCompletion >= 100 ? 'bg-emerald-400' : profile.profileCompletion >= 60 ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${Math.max(0, Math.min(100, profile.profileCompletion || 0))}%` }} /></div><span className="w-8 text-xs text-white/50">{profile.profileCompletion || 0}%</span></div></td><td className="px-5 py-3.5 text-xs text-white/60">{profile.linkedAgency?.name || 'Unlinked'}</td><td className="whitespace-nowrap px-5 py-3.5 text-xs text-white/50">{formatDate(profile.user?.createdAt)}</td><td className="px-5 py-3.5"><Link href={`/admin/agencies/${profile.id}`} className="text-xs font-semibold text-blue-300 hover:text-blue-200">View</Link></td></tr>)}</tbody></table></div>}
        {totalPages > 1 && <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3 text-xs text-white/40"><span>Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => navigate(currentStatus, page - 1)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 disabled:opacity-30">Previous</button><button disabled={page >= totalPages} onClick={() => navigate(currentStatus, page + 1)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 disabled:opacity-30">Next</button></div></div>}
      </div>
    </div>
  )
}
