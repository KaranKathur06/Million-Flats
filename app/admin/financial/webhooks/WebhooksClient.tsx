'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import SelectDropdown from '@/components/SelectDropdown'

interface WebhooksClientProps {
  webhooks: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function WebhooksClientContent({ webhooks, pagination }: WebhooksClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null)
  const [showRawPayload, setShowRawPayload] = useState(false)
  const [filters, setFilters] = useState({
    event: searchParams?.get('event') || '',
    processed: searchParams?.get('processed') || '',
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const updateFilters = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    params.set('page', '1')
    router.push(`/admin/financial/webhooks?${params.toString()}`)
  }

  const getEventBadge = (eventType: string) => {
    const styles = {
      'payment.captured': 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400',
      'payment.failed': 'bg-red-500/10 border-red-400/20 text-red-400',
      'payment.refunded': 'bg-purple-500/10 border-purple-400/20 text-purple-400',
      'order.paid': 'bg-blue-500/10 border-blue-400/20 text-blue-400',
    }
    return styles[eventType as keyof typeof styles] || 'bg-gray-500/10 border-gray-400/20 text-gray-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold text-white/95 tracking-tight">Webhook Logs</h1>
          <p className="text-[13px] font-medium text-white/50 mt-1">
            Monitor Razorpay webhook events and processing status
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-[160px]">
            <SelectDropdown
              label="Event"
              showLabel={false}
              dense
              variant="dark"
              value={filters.event}
              onChange={(v) => updateFilters('event', v)}
              options={[
                { value: '', label: 'All Events' },
                { value: 'payment.captured', label: 'Payment Captured' },
                { value: 'payment.failed', label: 'Payment Failed' },
                { value: 'payment.refunded', label: 'Payment Refunded' },
                { value: 'order.paid', label: 'Order Paid' },
              ]}
            />
          </div>

          <div className="w-[140px]">
            <SelectDropdown
              label="Status"
              showLabel={false}
              dense
              variant="dark"
              value={filters.processed}
              onChange={(v) => updateFilters('processed', v)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'true', label: 'Processed' },
                { value: 'false', label: 'Failed' },
              ]}
            />
          </div>

          {(filters.event || filters.processed) && (
            <button
              onClick={() => {
                setFilters({ event: '', processed: '' })
                router.push('/admin/financial/webhooks')
              }}
              className="h-10 px-4 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[13px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Webhooks Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Event</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Status</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Payment</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Time</th>
                <th className="text-right py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr
                  key={webhook.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => { setSelectedWebhook(webhook); setShowRawPayload(false); }}
                >
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getEventBadge(webhook.eventType)}`}
                    >
                      {webhook.eventType}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {webhook.processed ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-[11px] font-semibold text-emerald-400">
                          Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-400/20 text-[11px] font-semibold text-red-400">
                          Failed
                        </span>
                      )}
                      {webhook.retryCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/20 text-[10px] font-semibold text-amber-400">
                          {webhook.retryCount} retries
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {webhook.payment ? (
                      <div>
                        <p className="text-[12px] font-mono text-white/70">{webhook.payment.id.slice(0, 8)}...</p>
                        <p className="text-[11px] text-white/50">{webhook.payment.plan}</p>
                      </div>
                    ) : (
                      <span className="text-[12px] text-white/40">N/A</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[12px] text-white/60">{formatDate(webhook.createdAt)}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedWebhook(webhook)
                        setShowRawPayload(true)
                      }}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
                    >
                      View Payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
            <p className="text-[12px] text-white/50">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} webhooks
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams?.toString() || '')
                  params.set('page', String(pagination.page - 1))
                  router.push(`/admin/financial/webhooks?${params.toString()}`)
                }}
                disabled={pagination.page === 1}
                className="h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="text-[12px] text-white/60">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams?.toString() || '')
                  params.set('page', String(pagination.page + 1))
                  router.push(`/admin/financial/webhooks?${params.toString()}`)
                }}
                disabled={pagination.page === pagination.totalPages}
                className="h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Webhook Detail Modal */}
      {selectedWebhook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { setSelectedWebhook(null); setShowRawPayload(false); }}
        >
          <div
            className="w-full max-w-4xl rounded-2xl bg-[#0a1019] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-[17px] font-extrabold text-white/95 tracking-tight">Webhook Details</h2>
                <p className="text-[12px] text-white/50 mt-1">ID: {selectedWebhook.id}</p>
              </div>
              <button
                onClick={() => { setSelectedWebhook(null); setShowRawPayload(false); }}
                className="h-8 w-8 rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Event Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Event Type</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getEventBadge(selectedWebhook.eventType)}`}
                  >
                    {selectedWebhook.eventType}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Status</p>
                  {selectedWebhook.processed ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-[11px] font-semibold text-emerald-400">
                      Processed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-400/20 text-[11px] font-semibold text-red-400">
                      Failed
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Created At</p>
                  <p className="text-[12px] text-white/70">{formatDate(selectedWebhook.createdAt)}</p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Retry Count</p>
                  <p className="text-[14px] font-semibold text-white/90">{selectedWebhook.retryCount}</p>
                </div>
              </div>

              {/* Processing Error */}
              {!selectedWebhook.processed && selectedWebhook.processingError && (
                <div className="p-4 rounded-xl bg-red-500/[0.05] border border-red-400/20">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-red-400 mb-1">Processing Error</p>
                  <p className="text-[13px] text-white/90">{selectedWebhook.processingError}</p>
                </div>
              )}

              {/* Raw Payload */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Raw Payload</p>
                  <button
                    onClick={() => setShowRawPayload(!showRawPayload)}
                    className="text-[12px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    {showRawPayload ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showRawPayload ? (
                  <div className="rounded-xl bg-black/40 border border-white/[0.08] p-4 overflow-auto max-h-[400px]">
                    <pre className="text-[12px] text-white/70 font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedWebhook.payload, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                    <p className="text-[12px] text-white/50">
                      Payload contains {JSON.stringify(selectedWebhook.payload).length} characters
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => { setSelectedWebhook(null); setShowRawPayload(false); }}
                className="h-10 px-6 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[13px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WebhooksClient(props: WebhooksClientProps) {
  return (
    <Suspense fallback={<div className="text-white/50">Loading webhooks...</div>}>
      <WebhooksClientContent {...props} />
    </Suspense>
  )
}
