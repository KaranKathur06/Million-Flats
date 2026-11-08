'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircleAlert, Film, LoaderCircle, RefreshCw, Settings2 } from 'lucide-react'

type AdminReel = {
  id: string
  owner: { name: string | null; email: string; role: string }
  title: string
  caption: string | null
  mediaUrl: string
  mediaMimeType: string
  mediaSizeBytes: number
  durationMs: number
  createdAt: string
}

type AdminCampaign = {
  id: string
  status: string
  requestedStartAt: string | null
  approvedStartAt: string | null
  approvedEndAt: string | null
  allocationBps: number
  adminPriority: number
  rejectionReason: string | null
  packageSnapshot: Record<string, unknown>
  owner: { name: string | null; email: string; role: string }
  reel: { id: string; title: string }
  order: { status: string; totalAmount: number; currency: string; paidAt: string | null } | null
}

type CampaignPackage = {
  id: string
  slug: string
  name: string
  durationDays: number
  allocationBps: number
  amount: number
  taxRateBps: number
  dailyImpressionCap: number | null
  totalImpressionCap: number | null
  frequencyCap: number
  isActive: boolean
  version: number
}

type RotationSettings = {
  minFeedCardInterval: number
  maxAllocationBps: number
  defaultFrequencyCap: number
  schedulingHorizonDays: number
  defaultDailyImpressionCap: number | null
  defaultTotalImpressionCap: number | null
}

type AdminData = {
  reels: AdminReel[]
  campaigns: AdminCampaign[]
  settings: RotationSettings | null
  packages: CampaignPackage[]
  configuredTaxRateBps: number | null
  error?: string
}

const defaultSettings: RotationSettings = {
  minFeedCardInterval: 4,
  maxAllocationBps: 10_000,
  defaultFrequencyCap: 1,
  schedulingHorizonDays: 90,
  defaultDailyImpressionCap: null,
  defaultTotalImpressionCap: null,
}

function toLocalDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

async function parseResponse<T>(response: Response) {
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.')
  return data
}

export default function VideoCampaignsAdminClient() {
  const [data, setData] = useState<AdminData | null>(null)
  const [settings, setSettings] = useState<RotationSettings>(defaultSettings)
  const [startTimes, setStartTimes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [packageForm, setPackageForm] = useState({
    slug: '',
    name: '',
    durationDays: 30,
    allocationPercent: 10,
    amount: 10_000,
    taxRateBps: 0,
    frequencyCap: 1,
  })

  const refresh = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/admin/video-campaigns', { cache: 'no-store' })
      const next = await parseResponse<AdminData>(response)
      setData(next)
      const nextSettings = next.settings || defaultSettings
      setSettings(nextSettings)
      const configuredTaxRateBps = next.configuredTaxRateBps
      if (configuredTaxRateBps !== null) {
        setPackageForm((current) => ({ ...current, taxRateBps: configuredTaxRateBps }))
      }
      setStartTimes((existing) => {
        const values = { ...existing }
        for (const campaign of next.campaigns) {
          if (!values[campaign.id]) values[campaign.id] = toLocalDateTime(campaign.requestedStartAt)
        }
        return values
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load campaign management.')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const execute = async (key: string, operation: () => Promise<void>) => {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await operation()
      await refresh()
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'The requested action failed.')
    } finally {
      setBusy('')
    }
  }

  const moderateReel = async (reelId: string, action: 'approve' | 'reject') => {
    let reason: string | undefined
    if (action === 'reject') {
      reason = window.prompt('Reason for rejecting this video (required):')?.trim()
      if (!reason) throw new Error('A rejection reason is required.')
    }
    const response = await fetch(`/api/admin/video-reels/${reelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'reject' ? { action, reason } : { action }),
    })
    await parseResponse<{ reel: { id: string } }>(response)
    setNotice(`Video ${action === 'approve' ? 'approved' : 'rejected'}.`)
  }

  const moderateCampaign = async (campaign: AdminCampaign, action: 'approve' | 'reject' | 'pause' | 'resume') => {
    let body: Record<string, unknown> = { action }
    if (action === 'approve') {
      const startAt = startTimes[campaign.id]
      if (!startAt) throw new Error('Choose a campaign start time.')
      body = { action, startAt: new Date(startAt).toISOString(), priority: 0 }
    }
    if (action === 'reject') {
      const reason = window.prompt('Reason for rejecting this campaign (required):')?.trim()
      if (!reason) throw new Error('A rejection reason is required.')
      body = { action, reason }
    }
    const response = await fetch(`/api/admin/video-campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await parseResponse<{ campaign: { id: string } }>(response)
    setNotice(`Campaign ${action === 'approve' ? 'approved for payment' : `${action}d`}.`)
  }

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault()
    const response = await fetch('/api/admin/video-campaign-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    await parseResponse<{ settings: RotationSettings }>(response)
    setNotice('Rotation settings saved.')
  }

  const createPackage = async (event: React.FormEvent) => {
    event.preventDefault()
    const slug = packageForm.slug.trim().toLowerCase()
    const response = await fetch('/api/admin/video-campaign-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        name: packageForm.name.trim(),
        durationDays: Number(packageForm.durationDays),
        allocationBps: Math.round(Number(packageForm.allocationPercent) * 100),
        amount: Number(packageForm.amount),
        taxRateBps: Number(packageForm.taxRateBps),
        dailyImpressionCap: null,
        totalImpressionCap: null,
        frequencyCap: Number(packageForm.frequencyCap),
        isActive: true,
      }),
    })
    await parseResponse<{ package: CampaignPackage }>(response)
    setNotice('Campaign package created.')
    setPackageForm((current) => ({ ...current, slug: '', name: '' }))
  }

  const pendingCampaigns = data?.campaigns.filter((campaign) => campaign.status === 'PENDING_REVIEW') || []
  const liveCampaigns = data?.campaigns.filter((campaign) => ['APPROVED_AWAITING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'PAUSED'].includes(campaign.status)) || []

  return (
    <main className="min-h-full space-y-6 p-4 text-slate-900 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Media inventory</p>
          <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Video reels & campaigns</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Review creatives, schedule paid campaigns, and govern rotating inventory. Placements remain shared; exclusive ownership is not available.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10">
          <RefreshCw className="h-4 w-4" /> Refresh queue
        </button>
      </header>

      {error ? <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div> : null}
      {!data && !error ? <div className="flex items-center gap-2 py-12 text-sm text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" />Loading queues…</div> : null}

      {data ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-white p-5 shadow-sm" aria-labelledby="reel-review-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 id="reel-review-heading" className="font-semibold text-[#132943]">Creative review</h2><p className="mt-1 text-xs text-slate-500">{data.reels.length} pending video{data.reels.length === 1 ? '' : 's'} · private preview links expire in five minutes</p></div>
              <Film className="h-5 w-5 text-slate-400" />
            </div>
            {data.reels.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.reels.map((reel) => (
                  <article key={reel.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <video src={reel.mediaUrl} controls playsInline preload="metadata" className="aspect-video w-full bg-black" aria-label={`Preview ${reel.title}`} />
                    <div className="space-y-3 p-4">
                      <div><h3 className="font-semibold text-slate-800">{reel.title}</h3><p className="mt-1 text-xs text-slate-500">{reel.owner.name || reel.owner.email} · {reel.owner.role} · {Math.round(reel.durationMs / 1000)} sec</p>{reel.caption ? <p className="mt-2 line-clamp-3 text-sm text-slate-600">{reel.caption}</p> : null}</div>
                      <div className="flex gap-2">
                        <button type="button" disabled={busy !== ''} onClick={() => void execute(reel.id, () => moderateReel(reel.id, 'approve'))} className="min-h-10 flex-1 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Approve</button>
                        <button type="button" disabled={busy !== ''} onClick={() => void execute(reel.id, () => moderateReel(reel.id, 'reject'))} className="min-h-10 flex-1 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No videos are waiting for review.</p>}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white p-5 shadow-sm" aria-labelledby="campaign-review-heading">
            <div className="mb-4"><h2 id="campaign-review-heading" className="font-semibold text-[#132943]">Campaign review and delivery</h2><p className="mt-1 text-xs text-slate-500">{pendingCampaigns.length} pending review · {liveCampaigns.length} approved or delivering</p></div>
            <div className="space-y-3">
              {data.campaigns.map((campaign) => (
                <article key={campaign.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{campaign.reel.title}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-600">{campaign.status.replaceAll('_', ' ')}</span></div>
                      <p className="mt-1 text-xs text-slate-500">{campaign.owner.name || campaign.owner.email} · {campaign.owner.role} · {campaign.allocationBps / 100}% allocation</p>
                      {campaign.order ? <p className="mt-1 text-xs text-slate-500">Payment {campaign.order.status.toLowerCase()}{campaign.order.paidAt ? ` · paid ${new Date(campaign.order.paidAt).toLocaleDateString()}` : ''}</p> : null}
                      {campaign.rejectionReason ? <p className="mt-2 text-xs text-rose-700">{campaign.rejectionReason}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {campaign.status === 'PENDING_REVIEW' ? (
                        <>
                          <label className="sr-only" htmlFor={`start-${campaign.id}`}>Approved campaign start time</label>
                          <input id={`start-${campaign.id}`} type="datetime-local" value={startTimes[campaign.id] || ''} onChange={(event) => setStartTimes((current) => ({ ...current, [campaign.id]: event.target.value }))} className="min-h-10 rounded-lg border border-slate-200 px-2 text-xs" />
                          <button type="button" disabled={busy !== ''} onClick={() => void execute(campaign.id, () => moderateCampaign(campaign, 'approve'))} className="min-h-10 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Approve & schedule</button>
                          <button type="button" disabled={busy !== ''} onClick={() => void execute(campaign.id, () => moderateCampaign(campaign, 'reject'))} className="min-h-10 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button>
                        </>
                      ) : null}
                      {['ACTIVE', 'SCHEDULED'].includes(campaign.status) ? <button type="button" disabled={busy !== ''} onClick={() => void execute(campaign.id, () => moderateCampaign(campaign, 'pause'))} className="min-h-10 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">Pause</button> : null}
                      {campaign.status === 'PAUSED' ? <button type="button" disabled={busy !== ''} onClick={() => void execute(campaign.id, () => moderateCampaign(campaign, 'resume'))} className="min-h-10 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Resume</button> : null}
                    </div>
                  </div>
                </article>
              ))}
              {!data.campaigns.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No campaign requests are available.</p> : null}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <form onSubmit={(event) => { event.preventDefault(); void execute('settings', () => saveSettings(event)) }} className="rounded-2xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3"><Settings2 className="h-5 w-5 text-slate-400" /><div><h2 className="font-semibold text-[#132943]">Rotation controls</h2><p className="mt-1 text-xs text-slate-500">At least three organic/house cards between sponsored opportunities.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Sponsored card interval<input type="number" min={4} max={24} value={settings.minFeedCardInterval} onChange={(event) => setSettings((current) => ({ ...current, minFeedCardInterval: Number(event.target.value) }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Maximum inventory allocation (%)<input type="number" min={0.01} max={100} step={0.01} value={settings.maxAllocationBps / 100} onChange={(event) => setSettings((current) => ({ ...current, maxAllocationBps: Math.round(Number(event.target.value) * 100) }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Default frequency cap / 24h<input type="number" min={1} max={100} value={settings.defaultFrequencyCap} onChange={(event) => setSettings((current) => ({ ...current, defaultFrequencyCap: Number(event.target.value) }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Scheduling horizon (days)<input type="number" min={1} max={365} value={settings.schedulingHorizonDays} onChange={(event) => setSettings((current) => ({ ...current, schedulingHorizonDays: Number(event.target.value) }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
              </div>
              <button disabled={busy !== ''} className="mt-4 min-h-10 rounded-lg bg-[#132943] px-4 text-sm font-semibold text-white hover:bg-[#203c5a] disabled:opacity-50">Save rotation settings</button>
            </form>

            <form onSubmit={(event) => { event.preventDefault(); void execute('package', () => createPackage(event)) }} className="rounded-2xl border border-white/10 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-[#132943]">Create campaign package</h2>
              <p className="mb-4 mt-1 text-xs text-slate-500">
                Amounts use minor currency units (INR paise). Tax must match finance configuration at checkout.
                {data.configuredTaxRateBps === null ? ' Finance tax configuration is missing or invalid; package creation is disabled.' : ` Configured tax: ${data.configuredTaxRateBps} bps.`}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Package name<input required value={packageForm.name} onChange={(event) => setPackageForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={packageForm.slug} onChange={(event) => setPackageForm((current) => ({ ...current, slug: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Duration (days)<input type="number" min={1} max={365} required value={packageForm.durationDays} onChange={(event) => setPackageForm((current) => ({ ...current, durationDays: Number(event.target.value) }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Inventory allocation (%)<input type="number" min={0.01} max={100} step={0.01} required value={packageForm.allocationPercent} onChange={(event) => setPackageForm((current) => ({ ...current, allocationPercent: Number(event.target.value) }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Price (paise)<input type="number" min={1} required value={packageForm.amount} onChange={(event) => setPackageForm((current) => ({ ...current, amount: Number(event.target.value) }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Tax rate (basis points)<input type="number" min={0} max={10000} required value={packageForm.taxRateBps} onChange={(event) => setPackageForm((current) => ({ ...current, taxRateBps: Number(event.target.value) }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
                <label className="text-sm font-medium text-slate-700">Frequency cap / viewer / 24h<input type="number" min={1} max={100} required value={packageForm.frequencyCap} onChange={(event) => setPackageForm((current) => ({ ...current, frequencyCap: Number(event.target.value) }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
              </div>
              <button disabled={busy !== '' || data.configuredTaxRateBps === null} className="mt-4 min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Create package</button>
            </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[#132943]">Current packages</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400"><tr><th className="py-2">Package</th><th>Duration</th><th>Allocation</th><th>Price</th><th>Tax</th><th>Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.packages.map((item) => <tr key={item.id}><td className="py-3 font-medium text-slate-700">{item.name}<span className="ml-2 text-xs text-slate-400">v{item.version}</span></td><td>{item.durationDays} days</td><td>{item.allocationBps / 100}%</td><td>{item.amount.toLocaleString()} paise</td><td>{item.taxRateBps} bps</td><td>{item.isActive ? 'Active' : 'Inactive'}</td></tr>)}
                  {!data.packages.length ? <tr><td colSpan={6} className="py-5 text-slate-500">No packages configured.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  )
}
