'use client'

import Script from 'next/script'
import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, CheckCircle2, CircleAlert, Film, LoaderCircle, UploadCloud } from 'lucide-react'

type Reel = {
  id: string
  title: string
  durationMs: number
  moderationStatus: string
  reviewedAt: string | null
  rejectionReason: string | null
  mediaVerifiedAt: string | null
  createdAt: string
}

type CampaignPackage = {
  id: string
  slug: string
  name: string
  durationDays: number
  allocationBps: number
  amount: number
  currency: string
  dailyImpressionCap: number | null
  totalImpressionCap: number | null
  frequencyCap: number
}

type Campaign = {
  id: string
  status: string
  approvedStartAt: string | null
  approvedEndAt: string | null
  rejectionReason: string | null
  reel: { id: string; title: string; durationMs: number }
  order: { status: string; amount: number; taxAmount: number; totalAmount: number; currency: string; paidAt: string | null } | null
  metrics: { impressions: number; starts: number; qualifiedViews: number; completions: number; clicks: number; engagements: number; ctr: number | null; completionRate: number | null }
}

type ApiResult<T> = T & { error?: string }
type RazorpayPaymentResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>
  modal?: { ondismiss?: () => void }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void
    }
  }
}

async function readJson<T>(response: Response) {
  const data = await response.json() as ApiResult<T>
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.')
  return data
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)
}

function statusStyle(status: string) {
  if (['ACTIVE', 'SCHEDULED', 'APPROVED', 'CAPTURED'].includes(status)) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (['REJECTED', 'FAILED', 'CANCELLED'].includes(status)) return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-amber-50 text-amber-800 ring-amber-200'
}

export default function AdvertiserDashboard() {
  const [reels, setReels] = useState<Reel[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [packages, setPackages] = useState<CampaignPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedReelId, setSelectedReelId] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [destination, setDestination] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      const [reelResponse, campaignResponse, packageResponse] = await Promise.all([
        fetch('/api/video-reels/mine', { cache: 'no-store' }),
        fetch('/api/video-campaigns', { cache: 'no-store' }),
        fetch('/api/video-campaign-packages', { cache: 'no-store' }),
      ])
      const [reelData, campaignData, packageData] = await Promise.all([
        readJson<{ reels: Reel[] }>(reelResponse),
        readJson<{ campaigns: Campaign[] }>(campaignResponse),
        readJson<{ packages: CampaignPackage[] }>(packageResponse),
      ])
      setReels(reelData.reels || [])
      setCampaigns(campaignData.campaigns || [])
      setPackages(packageData.packages || [])
      setSelectedReelId((current) => current || reelData.reels?.find((reel) => reel.moderationStatus === 'APPROVED')?.id || '')
      setSelectedPackageId((current) => current || packageData.packages?.[0]?.id || '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load advertiser data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const uploadVideo = async () => {
    if (!selectedFile) throw new Error('Choose an MP4 or WebM video first.')
    if (!['video/mp4', 'video/webm'].includes(selectedFile.type)) throw new Error('Only MP4 and WebM videos are supported.')
    if (selectedFile.size > 500 * 1024 * 1024) throw new Error('The selected video exceeds the maximum supported size.')

    const presignResponse = await fetch('/api/video-reels/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        caption: caption.trim(),
        contentType: selectedFile.type,
        sizeBytes: selectedFile.size,
      }),
    })
    const presign = await readJson<{ reelId: string; uploadUrl: string }>(presignResponse)
    const uploadResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': selectedFile.type,
        'Cache-Control': 'private, no-store',
      },
      body: selectedFile,
    })
    if (!uploadResponse.ok) throw new Error('The video could not be uploaded. Please try again.')

    const finalizeResponse = await fetch(`/api/video-reels/${presign.reelId}/finalize`, { method: 'POST' })
    await readJson<{ success: boolean; durationMs: number }>(finalizeResponse)
    setNotice('Video uploaded and verified. Submit it for review to make it eligible for a campaign.')
    setTitle('')
    setCaption('')
    setSelectedFile(null)
    await refresh()
  }

  const submitReel = async (reelId: string) => {
    const response = await fetch(`/api/video-reels/${reelId}/submit`, { method: 'POST' })
    await readJson<{ success: boolean }>(response)
    setNotice('Video submitted for moderation.')
    await refresh()
  }

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedReelId || !selectedPackageId) throw new Error('Choose an approved video and a campaign package.')
    const response = await fetch('/api/video-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reelId: selectedReelId,
        packageId: selectedPackageId,
        destination: destination.trim() || undefined,
      }),
    })
    await readJson<{ campaign: { id: string } }>(response)
    setNotice('Campaign request submitted for review. Checkout opens after approval.')
    setDestination('')
    await refresh()
  }

  const payForCampaign = async (campaignId: string) => {
    if (!window.Razorpay) throw new Error('Secure checkout is still loading. Please try again in a moment.')
    const storageKey = `mf-video-checkout:${campaignId}`
    let idempotencyKey = sessionStorage.getItem(storageKey)
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID()
      sessionStorage.setItem(storageKey, idempotencyKey)
    }
    const orderResponse = await fetch(`/api/video-campaigns/${campaignId}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey }),
    })
    const order = await readJson<{ orderId?: string; amount?: number; currency?: string; keyId?: string; status?: string }>(orderResponse)
    if (order.status === 'CAPTURED') {
      setNotice('This campaign has already been paid.')
      await refresh()
      return
    }
    if (!order.orderId || !order.amount || !order.currency || !order.keyId) {
      throw new Error('Checkout order details were incomplete. Contact support if payment was already attempted.')
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'MillionFlats',
      description: 'Featured video campaign',
      order_id: order.orderId,
      handler: async (payment) => {
        setBusy(campaignId)
        try {
          const verifyResponse = await fetch(`/api/video-campaigns/${campaignId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: payment.razorpay_order_id,
              paymentId: payment.razorpay_payment_id,
              signature: payment.razorpay_signature,
            }),
          })
          await readJson<{ success: boolean }>(verifyResponse)
          sessionStorage.removeItem(storageKey)
          setNotice('Payment verified. Your campaign is now scheduled for delivery.')
          await refresh()
        } catch (verificationError) {
          setError(verificationError instanceof Error ? verificationError.message : 'Payment verification is pending.')
        } finally {
          setBusy('')
        }
      },
    })
    checkout.on('payment.failed', (failure) => {
      setError(failure.error?.description || 'Payment was not completed.')
    })
    checkout.open()
  }

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The requested action failed.')
    } finally {
      setBusy('')
    }
  }

  const approvedReels = reels.filter((reel) => reel.moderationStatus === 'APPROVED')

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#92713b]">Advertiser studio</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#132943]">Video campaigns</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Upload a short-form property video, submit it for review, then book a scheduled share of rotating featured inventory.
              </p>
            </div>
            <button type="button" onClick={() => void refresh()} className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Refresh status
            </button>
          </div>

          {error ? <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
          {notice ? <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div> : null}
          {loading ? <div className="flex items-center gap-2 py-12 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your advertiser workspace…</div> : null}

          {!loading ? (
            <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="upload-reel-heading">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#132943]/[0.07] text-[#132943]"><UploadCloud className="h-5 w-5" /></span>
                  <div><h2 id="upload-reel-heading" className="font-semibold text-[#132943]">Upload a property reel</h2><p className="mt-1 text-xs text-slate-500">Private until approved by MillionFlats.</p></div>
                </div>
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void run('upload', uploadVideo) }}>
                  <label className="block text-sm font-medium text-slate-700">
                    Video title
                    <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#132943] focus:ring-2 focus:ring-[#132943]/10" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Caption <span className="font-normal text-slate-400">optional</span>
                    <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2000} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#132943] focus:ring-2 focus:ring-[#132943]/10" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    MP4 or WebM file
                    <input type="file" accept="video/mp4,video/webm" required onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-200 p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold" />
                    <span className="mt-1 block text-xs font-normal text-slate-500">Maximum 60 seconds. Uploads are privately stored and server-verified.</span>
                  </label>
                  <button disabled={busy !== '' || !title.trim() || !selectedFile} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#132943] px-4 text-sm font-semibold text-white transition hover:bg-[#203c5a] disabled:cursor-not-allowed disabled:opacity-50">
                    {busy === 'upload' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    Upload and verify
                  </button>
                </form>

                <div className="mt-7 border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#132943]">Your videos</h3>
                  {reels.length ? (
                    <ul className="space-y-3">
                      {reels.map((reel) => (
                        <li key={reel.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <Film className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">{reel.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{Math.round(reel.durationMs / 1000)} sec · {new Date(reel.createdAt).toLocaleDateString()}</p>
                              {reel.rejectionReason ? <p className="mt-1 text-xs text-rose-700">{reel.rejectionReason}</p> : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${statusStyle(reel.moderationStatus)}`}>{reel.moderationStatus.replaceAll('_', ' ')}</span>
                            {reel.moderationStatus === 'DRAFT' && reel.mediaVerifiedAt ? (
                              <button type="button" disabled={busy !== ''} onClick={() => void run(`submit-${reel.id}`, () => submitReel(reel.id))} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Submit</button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-slate-500">No videos yet. Upload your first reel to get started.</p>}
                </div>
              </section>

              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="book-campaign-heading">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#92713b]">Rotating inventory</p>
                    <h2 id="book-campaign-heading" className="mt-1 font-semibold text-[#132943]">Request a campaign</h2>
                    <p className="mt-1 text-sm text-slate-500">Your package defines campaign duration and allocation. Placements rotate with other eligible advertisers.</p>
                  </div>
                  {approvedReels.length && packages.length ? (
                    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void run('campaign', () => createCampaign(event)) }}>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-slate-700">Approved video</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {approvedReels.map((reel) => (
                            <label key={reel.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${selectedReelId === reel.id ? 'border-[#132943] bg-[#132943]/[0.04]' : 'border-slate-200 hover:border-slate-300'}`}>
                              <input type="radio" name="campaign-reel" value={reel.id} checked={selectedReelId === reel.id} onChange={() => setSelectedReelId(reel.id)} className="mt-1 accent-[#132943]" />
                              <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{reel.title}</span><span className="mt-1 block text-xs text-slate-500">{Math.round(reel.durationMs / 1000)} sec</span></span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-slate-700">Choose a package</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {packages.map((item) => (
                            <label key={item.id} className={`cursor-pointer rounded-xl border p-3 transition ${selectedPackageId === item.id ? 'border-[#132943] bg-[#132943]/[0.04]' : 'border-slate-200 hover:border-slate-300'}`}>
                              <span className="flex items-start gap-3">
                                <input type="radio" name="campaign-package" value={item.id} checked={selectedPackageId === item.id} onChange={() => setSelectedPackageId(item.id)} className="mt-1 accent-[#132943]" />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-800"><span>{item.name}</span><span>{formatCurrency(item.amount, item.currency)}</span></span>
                                  <span className="mt-1 block text-xs leading-5 text-slate-500">{item.durationDays} days · {item.allocationBps / 100}% share of sponsored opportunities · up to {item.frequencyCap} delivery per viewer / 24h</span>
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className="block text-sm font-medium text-slate-700">
                        Campaign destination <span className="font-normal text-slate-400">optional; HTTPS or a public project/property path</span>
                        <input value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={2048} placeholder="https://… or /projects/…" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#132943] focus:ring-2 focus:ring-[#132943]/10" />
                      </label>
                      <button disabled={busy !== ''} className="min-h-11 w-full rounded-xl bg-[#132943] px-4 text-sm font-semibold text-white transition hover:bg-[#203c5a] disabled:opacity-50">Submit for campaign review</button>
                    </form>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                      {!approvedReels.length ? 'A moderated and approved video is required before requesting a campaign.' : 'Campaign packages are not available yet. Please check back later.'}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="campaign-results-heading">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div><h2 id="campaign-results-heading" className="font-semibold text-[#132943]">Campaigns and performance</h2><p className="mt-1 text-xs text-slate-500">Metrics update as eligible sponsored reels are delivered.</p></div>
                  </div>
                  {campaigns.length ? (
                    <ul className="space-y-3">
                      {campaigns.map((campaign) => (
                        <li key={campaign.id} className="rounded-xl border border-slate-100 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">{campaign.reel.title}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ring-1 ring-inset ${statusStyle(campaign.status)}`}>{campaign.status.replaceAll('_', ' ')}</span>
                                {campaign.order ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ring-1 ring-inset ${statusStyle(campaign.order.status)}`}>Payment {campaign.order.status.toLowerCase()}</span> : null}
                              </div>
                              {campaign.approvedStartAt ? <p className="mt-2 text-xs text-slate-500">Scheduled {new Date(campaign.approvedStartAt).toLocaleString()}{campaign.approvedEndAt ? ` – ${new Date(campaign.approvedEndAt).toLocaleDateString()}` : ''}</p> : null}
                            </div>
                            {campaign.status === 'APPROVED_AWAITING_PAYMENT' && campaign.order?.status !== 'CAPTURED' ? (
                              <button type="button" disabled={busy !== ''} onClick={() => void run(campaign.id, () => payForCampaign(campaign.id))} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f2c56b] px-4 text-sm font-semibold text-[#132943] hover:bg-[#ffda8c] disabled:opacity-50">
                                Pay securely <ArrowUpRight className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-6">
                            {[
                              ['Impressions', campaign.metrics.impressions],
                              ['Starts', campaign.metrics.starts],
                              ['Qualified views', campaign.metrics.qualifiedViews],
                              ['Completions', campaign.metrics.completions],
                              ['Clicks', campaign.metrics.clicks],
                              ['CTR', campaign.metrics.ctr === null ? '—' : `${(campaign.metrics.ctr * 100).toFixed(2)}%`],
                            ].map(([label, value]) => <div key={label} className="min-w-0"><p className="truncate text-[10px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{typeof value === 'number' ? value.toLocaleString() : value}</p></div>)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No campaigns yet. Submit a campaign request after your video is approved.</p>}
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}
