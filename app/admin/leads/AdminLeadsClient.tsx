'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { LeadCountry, LeadType } from '@prisma/client'
import { MobileOffCanvasPanel } from '@/components/responsive'
import FormSelect from '@/components/FormSelect'
import {
  BUDGET_RANGE_FILTER_OPTIONS,
  COUNTRY_FILTER_OPTIONS,
  DATE_RANGE_PRESETS,
  displayCategory,
  ECOSYSTEM_CATEGORIES,
  LEAD_TYPE_FILTER_OPTIONS,
  LEAD_TYPE_LABELS,
  statusesForLeadType,
  THREE_D_TOUR_PROPERTY_TYPE_FILTER_OPTIONS,
} from '@/lib/leads/constants'
import { normalizeLeadType } from '@/lib/leads/types'
import { fetchAdminLeads, filtersToSearchParams, type LeadsApiFilters } from '@/lib/leads/clientFetch'
import { getAdminCapabilities } from '@/lib/adminCapabilities'
import { LEAD_TEMPERATURE_STYLES, threeDTourLeadTemperature } from '@/lib/leads/leadTemperature'
import type { LeadForDisplay } from '@/lib/leads/mapLeadForDisplay'
import { isLeadCountInSync } from '@/lib/leads/syncHealth'

function LeadTemperatureBadge({
  leadType,
  timeline,
  budgetRange,
}: {
  leadType: LeadType
  timeline?: string | null
  budgetRange?: string | null
}) {
  if (leadType !== 'THREE_D_TOUR') return null
  const temp = threeDTourLeadTemperature({ timeline, budgetRange })
  const style = LEAD_TEMPERATURE_STYLES[temp]
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.className}`}>
      {style.label}
    </span>
  )
}

type ProjectOption = { id: string; name: string; slug: string }

type LeadRow = {
  id: string
  leadType: LeadType
  category: string | null
  name: string
  email: string
  phone: string | null
  projectOrCompany: string | null
  sourceName?: string | null
  country: LeadCountry
  status: string
  assignedTo: string | null
  propertyType?: string | null
  propertyName?: string | null
  propertySize?: string | null
  budgetRange?: string | null
  timeline?: string | null
  referralCode?: string | null
  createdAt: string
}

type LeadStats = {
  total: number
  today: number
  week: number
  month: number
  threeDTour: number
  project: number
  contact: number
  ecosystem: number
  threeDTourDemoScheduled: number
  threeDTourProposalSent: number
  threeDTourWon: number
  threeDTourLost: number
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', credentials: 'include' })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok || !json?.success) {
    throw new Error(safeString(json?.message) || 'Request failed')
  }
  return json as T
}

function filtersFromSearchParams(sp: URLSearchParams): LeadsApiFilters {
  return {
    leadType: (normalizeLeadType(sp.get('leadType')) || '') as LeadType | '',
    category: safeString(sp.get('category') || sp.get('ecosystemCategory')),
    projectId: safeString(sp.get('projectId')),
    status: safeString(sp.get('status')),
    country: safeString(sp.get('country')) as LeadCountry | '',
    range: safeString(sp.get('range')),
    from: safeString(sp.get('from')),
    to: safeString(sp.get('to')),
    q: safeString(sp.get('q')),
    propertyType: safeString(sp.get('propertyType')),
    budgetRange: safeString(sp.get('budgetRange')),
    assignedTo: safeString(sp.get('assignedTo')),
  }
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent || 'text-white'}`}>{value.toLocaleString()}</p>
    </div>
  )
}

function filtersFromFormData(fd: FormData): LeadsApiFilters {
  return {
    leadType: (normalizeLeadType(fd.get('leadType')) || '') as LeadType | '',
    category: safeString(fd.get('category')),
    projectId: safeString(fd.get('projectId')),
    status: safeString(fd.get('status')),
    country: safeString(fd.get('country')) as LeadCountry | '',
    range: safeString(fd.get('range')),
    from: safeString(fd.get('from')),
    to: safeString(fd.get('to')),
    q: safeString(fd.get('q')),
    propertyType: safeString(fd.get('propertyType')),
    budgetRange: safeString(fd.get('budgetRange')),
    assignedTo: safeString(fd.get('assignedTo')),
  }
}

export default function AdminLeadsClient({
  currentRole,
  projects,
}: {
  currentRole: unknown
  projects: ProjectOption[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const caps = useMemo(() => getAdminCapabilities(currentRole), [currentRole])
  const canModerate = Boolean(caps?.listings?.approve) || Boolean(caps?.agents?.approve)

  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<LeadForDisplay | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [syncOk, setSyncOk] = useState(true)

  const sp = searchParams ?? new URLSearchParams()
  const activeFilters = useMemo(() => filtersFromSearchParams(sp), [sp.toString()])
  const {
    leadType,
    category,
    projectId,
    status,
    country,
    range,
    from,
    to,
    q,
    propertyType,
    budgetRange,
    assignedTo,
  } = activeFilters

  const apiParams = useMemo(() => filtersToSearchParams(activeFilters), [activeFilters])

  const loadLeads = useCallback(async (params: URLSearchParams) => {
    setLoading(true)
    setListError('')
    try {
      const data = (await fetchAdminLeads(params)) as {
        stats: LeadStats
        leads: LeadRow[]
        total: number
        sync?: { inSync: boolean; dashboardCount?: number; tableCount?: number }
        filters?: LeadsApiFilters
      }
      setStats(data.stats)
      setLeads(data.leads ?? [])
      setTotal(data.total ?? 0)
      const inSync = isLeadCountInSync(data.stats?.total, data.total)
      setSyncOk(inSync)
      if (!inSync) {
        console.warn('Lead data verification warning', {
          dashboardTotal: data.stats?.total,
          tableTotal: data.total,
          filters: data.filters,
          query: params.toString(),
        })
      }
    } catch (e) {
      setLeads([])
      setTotal(0)
      setListError(e instanceof Error ? e.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [])

  const applyFilters = useCallback(
    (filters: LeadsApiFilters) => {
      setLoading(true)
      const params = filtersToSearchParams(filters)
      const qs = params.toString()
      router.replace(qs ? `/admin/leads?${qs}` : '/admin/leads', { scroll: false })
    },
    [router],
  )

  const searchKey = sp.toString()
  useEffect(() => {
    const params = filtersToSearchParams(filtersFromSearchParams(new URLSearchParams(searchKey)))
    void loadLeads(params)
  }, [searchKey, loadLeads])

  const openDetail = async (id: string) => {
    const leadId = String(id || '').trim()
    if (!leadId) {
      setDetailError('Invalid lead ID')
      setDrawerOpen(true)
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Lead ID', leadId)
    }

    setDrawerOpen(true)
    setDetailLeadId(leadId)
    setDetailLoading(true)
    setDetailError('')
    setDetail(null)

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching lead', leadId)
      }
      const data = await fetchJson<{ lead: LeadForDisplay }>(`/api/admin/leads/${encodeURIComponent(leadId)}`)
      if (process.env.NODE_ENV !== 'production') {
        console.log('Lead fetch response', data)
        console.log('Lead data', data.lead)
      }
      if (!data.lead?.id) {
        throw new Error('Lead record missing from API response')
      }
      setDetail(data.lead)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load lead'
      setDetailError(message)
      if (process.env.NODE_ENV !== 'production') {
        console.error('Lead detail fetch failed', { leadId, message })
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const updateLead = async (patch: { status?: string; onboard?: boolean }) => {
    if (!detail?.id) return
    setBusy(true)
    setDetailError('')
    try {
      await fetchJson(`/api/admin/leads/${encodeURIComponent(detail.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      await openDetail(detail.id)
      await loadLeads(filtersToSearchParams(filtersFromSearchParams(sp)))
      router.refresh()
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const statusOptions = useMemo(() => {
    const list = statusesForLeadType(leadType || detail?.leadType)
    return [{ value: '', label: 'All statuses' }, ...list.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]
  }, [leadType, detail?.leadType])

  const drawerStatuses = detail?.allowedStatuses ?? statusesForLeadType(detail?.leadType)

  const drawerPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90">Lead detail</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-white">{detail?.name || '—'}</h2>
            {detail ? (
              <LeadTemperatureBadge
                leadType={detail.leadType}
                timeline={detail.timeline}
                budgetRange={detail.budgetRange}
              />
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6 mf-drawer-scroll">
        {detailLoading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : detailError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-200">Unable to load lead details.</p>
            <p className="text-xs text-red-200/80 break-words">{detailError}</p>
            <div className="flex flex-wrap gap-2">
              {detailLeadId ? (
                <button
                  type="button"
                  onClick={() => openDetail(detailLeadId)}
                  className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-400/20"
                >
                  Retry
                </button>
              ) : null}
              <Link
                href="/admin/leads/health"
                className="inline-flex rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                View diagnostics
              </Link>
            </div>
          </div>
        ) : detail ? (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35">Lead</h3>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-white/45">Lead ID</dt>
                  <dd className="text-white font-mono text-xs break-all">{detail.id}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Lead type</dt>
                  <dd className="text-white">{detail.leadTypeLabel}</dd>
                </div>
                {detail.leadType === 'ECOSYSTEM' ? (
                  <>
                    <div>
                      <dt className="text-white/45">Partner category</dt>
                      <dd className="text-white">{detail.partnerCategory || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-white/45">Partner name</dt>
                      <dd className="text-white">{detail.partnerName || '—'}</dd>
                    </div>
                  </>
                ) : null}
                <div>
                  <dt className="text-white/45">Category</dt>
                  <dd className="text-white">{detail.categoryLabel}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Status</dt>
                  <dd className="text-white">{detail.status}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Assigned to</dt>
                  <dd className="text-white">{detail.assignedTo || '—'}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Created</dt>
                  <dd className="text-white">{new Date(detail.createdAt).toLocaleString()}</dd>
                </div>
                {detail.project ? (
                  <div>
                    <dt className="text-white/45">Project</dt>
                    <dd>
                      <Link href={`/projects/${detail.project.slug}`} className="text-amber-300 hover:underline">
                        {detail.project.name}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35">Contact</h3>
              <dl className="grid gap-2 text-sm">
                <div><dt className="text-white/45">Name</dt><dd className="text-white">{detail.name}</dd></div>
                <div><dt className="text-white/45">Email</dt><dd className="text-white break-all">{detail.email}</dd></div>
                <div><dt className="text-white/45">Phone</dt><dd className="text-white">{detail.phone || '—'}</dd></div>
                {detail.whatsapp ? (
                  <div><dt className="text-white/45">WhatsApp</dt><dd className="text-white">{detail.whatsapp}</dd></div>
                ) : null}
                <div><dt className="text-white/45">Country</dt><dd className="text-white">{detail.country}</dd></div>
                <div>
                  <dt className="text-white/45">Source page</dt>
                  <dd className="text-white break-all">{detail.sourcePage || '—'}</dd>
                </div>
              </dl>
            </section>

            {(detail.utmSource || detail.utmMedium || detail.utmCampaign) ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35">UTM</h3>
                <dl className="grid gap-1 text-sm text-white/80">
                  <div>Source: {detail.utmSource || '—'}</div>
                  <div>Medium: {detail.utmMedium || '—'}</div>
                  <div>Campaign: {detail.utmCampaign || '—'}</div>
                </dl>
              </section>
            ) : null}

            {detail.message ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35 mb-2">Message</h3>
                <p className="text-sm text-white/80 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  {detail.message}
                </p>
              </section>
            ) : null}

            {detail.notes ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35 mb-2">Notes</h3>
                <p className="text-sm text-white/80 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  {detail.notes}
                </p>
              </section>
            ) : null}

            {detail.leadType === 'THREE_D_TOUR' ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35">3D Tour inquiry</h3>
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="text-white/45">Property</dt>
                    <dd className="text-white">{detail.propertyName || detail.projectOrCompany || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Size</dt>
                    <dd className="text-white">{detail.propertySize || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Budget</dt>
                    <dd className="text-white">{detail.budgetRangeLabel || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Timeline</dt>
                    <dd className="text-white">{detail.timelineLabel || '—'}</dd>
                  </div>
                  {detail.referralCode ? (
                    <div>
                      <dt className="text-white/45">Referral code</dt>
                      <dd className="text-white font-mono text-xs">{detail.referralCode}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35">Status pipeline</h3>
              <div className="flex flex-wrap gap-2">
                {drawerStatuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={!canModerate || busy || detail.status === s}
                    onClick={() => updateLead({ status: s, onboard: s === 'APPROVED' || s === 'ONBOARDED' })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      detail.status === s
                        ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                        : 'border-white/10 text-white/70 hover:bg-white/5 disabled:opacity-40'
                    }`}
                  >
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              {detail.ecosystemPartner ? (
                <p className="text-xs text-emerald-300/90">
                  Partner record: {detail.ecosystemPartner.name} ({detail.ecosystemPartner.status})
                </p>
              ) : null}
            </section>
          </>
        ) : (
          <p className="text-sm text-white/50">No lead selected</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {listError ? <p className="text-sm font-semibold text-red-300">{listError}</p> : null}

      {!loading && !syncOk && stats ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Data verification warning: dashboard shows {Number(stats.total).toLocaleString()} but the table has{' '}
          {Number(total).toLocaleString()} rows for the current filters.{' '}
          <Link href="/admin/leads/health" className="underline text-amber-50">
            View diagnostics
          </Link>
        </div>
      ) : null}

      {stats ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <KpiCard label="Total Leads" value={stats.total} />
            <KpiCard label="Today" value={stats.today} accent="text-amber-300" />
            <KpiCard label="This Week" value={stats.week} />
            <KpiCard label="This Month" value={stats.month} />
            <KpiCard label="3D Tour Leads" value={stats.threeDTour} accent="text-orange-300" />
            <KpiCard label="Project Leads" value={stats.project} accent="text-sky-300" />
            <KpiCard label="Contact Leads" value={stats.contact} accent="text-violet-300" />
            <KpiCard label="Ecosystem Leads" value={stats.ecosystem} accent="text-emerald-300" />
          </div>
          {(leadType === 'THREE_D_TOUR' || leadType === '') && stats.threeDTour > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              <KpiCard label="Demo Scheduled" value={stats.threeDTourDemoScheduled} accent="text-cyan-300" />
              <KpiCard label="Proposal Sent" value={stats.threeDTourProposalSent} accent="text-indigo-300" />
              <KpiCard label="Won" value={stats.threeDTourWon} accent="text-emerald-300" />
              <KpiCard label="Lost" value={stats.threeDTourLost} accent="text-red-300" />
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4"
        method="get"
        onSubmit={(e) => {
          e.preventDefault()
          applyFilters(filtersFromFormData(new FormData(e.currentTarget)))
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Lead type</label>
            <FormSelect
              key={`lead-type-${leadType}`}
              name="leadType"
              defaultValue={leadType}
              options={LEAD_TYPE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              dense
            />
          </div>

          {leadType === 'PROJECT' ? (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Project</label>
              <FormSelect
                key={`project-${projectId}`}
                name="projectId"
                defaultValue={projectId}
                options={[
                  { value: '', label: 'All Projects' },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
                dense
              />
            </div>
          ) : null}

          {leadType === 'ECOSYSTEM' ? (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Category</label>
              <FormSelect
                key={`eco-cat-${category}`}
                name="category"
                defaultValue={category}
                options={[
                  { value: '', label: 'All Categories' },
                  ...ECOSYSTEM_CATEGORIES.map((o) => ({ value: o.value, label: o.label })),
                ]}
                dense
              />
            </div>
          ) : null}

          {leadType === 'THREE_D_TOUR' ? (
            <>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Property type</label>
                <FormSelect
                  key={`3d-prop-${propertyType}`}
                  name="propertyType"
                  defaultValue={propertyType}
                  options={THREE_D_TOUR_PROPERTY_TYPE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  dense
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Budget</label>
                <FormSelect
                  key={`3d-budget-${budgetRange}`}
                  name="budgetRange"
                  defaultValue={budgetRange}
                  options={BUDGET_RANGE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  dense
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Status</label>
            <FormSelect
              key={`status-${status}-${leadType}`}
              name="status"
              defaultValue={status}
              options={statusOptions}
              dense
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Country</label>
            <FormSelect
              key={`country-${country}`}
              name="country"
              defaultValue={country}
              options={COUNTRY_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              dense
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Date range</label>
            <FormSelect
              name="range"
              defaultValue={range}
              options={DATE_RANGE_PRESETS.map((o) => ({ value: o.value, label: o.label }))}
              dense
            />
          </div>

          {range === 'custom' ? (
            <>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">From</label>
                <input
                  type="date"
                  name="from"
                  defaultValue={from}
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">To</label>
                <input
                  type="date"
                  name="to"
                  defaultValue={to}
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white"
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Assigned to</label>
            <input
              name="assignedTo"
              defaultValue={assignedTo}
              placeholder="User ID"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Search</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, email, phone, property, referral…"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[13px] text-[#0b1220] font-semibold"
          >
            Apply filters
          </button>
          <Link
            href="/admin/leads"
            className="inline-flex h-10 items-center px-4 rounded-xl border border-white/10 text-[13px] text-white/70 hover:bg-white/5"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-white/50">
            {loading
              ? 'Loading…'
              : `${total.toLocaleString()} lead${total === 1 ? '' : 's'}${stats && isLeadCountInSync(stats.total, total) ? '' : ' (count mismatch)'}`}
          </p>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-3 pr-3">ID</th>
                <th className="py-3 pr-3">Type</th>
                <th className="py-3 pr-3">Category</th>
                <th className="py-3 pr-3">Name</th>
                <th className="py-3 pr-3">Email</th>
                <th className="py-3 pr-3">Phone</th>
                <th className="py-3 pr-3">Project / Co.</th>
                <th className="py-3 pr-3">Country</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3">Created</th>
                <th className="py-3 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody key={apiParams.toString()}>
              {leads.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 pr-3 font-mono text-xs text-white/50 max-w-[100px] truncate" title={row.id}>
                    {row.id.slice(0, 8)}…
                  </td>
                  <td className="py-3 pr-3 text-white/85 whitespace-nowrap">{LEAD_TYPE_LABELS[row.leadType]}</td>
                  <td className="py-3 pr-3 text-white/75 max-w-[140px] truncate">
                    {displayCategory(row.leadType, row.category)}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-white font-medium">{row.name}</span>
                      <LeadTemperatureBadge
                        leadType={row.leadType}
                        timeline={row.timeline}
                        budgetRange={row.budgetRange}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-white/70 break-all max-w-[180px]">{row.email}</td>
                  <td className="py-3 pr-3 text-white/70">{row.phone || '—'}</td>
                  <td className="py-3 pr-3 text-white/70 max-w-[140px] truncate">{row.projectOrCompany || '—'}</td>
                  <td className="py-3 pr-3 text-white/70">{row.country}</td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-xs font-semibold">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-white/55 whitespace-nowrap text-xs">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => openDetail(row.id)}
                      className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/20"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && leads.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">No leads match your filters.</p>
          ) : null}
        </div>

        <div className="md:hidden space-y-3">
          {leads.map((row) => (
            <div key={row.id} className="rounded-xl border border-white/10 bg-[#0f1a2e] p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{row.name}</p>
                  <p className="text-xs text-white/60">{LEAD_TYPE_LABELS[row.leadType]}</p>
                </div>
                <span className="text-xs rounded-full border border-white/10 px-2 py-0.5">{row.status}</span>
              </div>
              <p className="mt-2 text-sm text-white/70">
                {displayCategory(row.leadType, row.category) !== '—'
                  ? displayCategory(row.leadType, row.category)
                  : row.sourceName || row.projectOrCompany || '—'}
              </p>
              <button
                type="button"
                onClick={() => openDetail(row.id)}
                className="mt-3 w-full rounded-lg bg-amber-400/15 py-2 text-xs font-semibold text-amber-200"
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop drawer */}
      <div
        className={`hidden md:block fixed inset-y-0 right-0 z-[70] w-full max-w-md border-l border-white/[0.08] bg-[#0b1220] shadow-2xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        style={{ top: 'var(--admin-header-height, 4.5rem)' }}
      >
        {drawerPanel}
      </div>
      {drawerOpen ? (
        <div className="hidden md:block fixed inset-0 z-[60] bg-black/40" onClick={() => setDrawerOpen(false)} />
      ) : null}

      <MobileOffCanvasPanel open={drawerOpen} onClose={() => setDrawerOpen(false)} side="right" title="Lead">
        {drawerPanel}
      </MobileOffCanvasPanel>
    </div>
  )
}
