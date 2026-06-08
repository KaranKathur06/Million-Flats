'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import SelectDropdown from '@/components/SelectDropdown'

interface SubscriptionsClientProps {
  subscriptions: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function SubscriptionsClientContent({ subscriptions, pagination }: SubscriptionsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null)
  const [actionModal, setActionModal] = useState<{ type: 'upgrade' | 'cancel' | 'extend'; subscription: any } | null>(null)
  const [filters, setFilters] = useState({
    status: searchParams?.get('status') || '',
    plan: searchParams?.get('plan') || '',
    search: searchParams?.get('search') || '',
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const updateFilters = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    params.set('page', '1')
    router.push(`/admin/financial/subscriptions?${params.toString()}`)
  }

  const getStatusBadge = (status: string, endDate: string) => {
    const daysRemaining = getDaysRemaining(endDate)

    if (status === 'EXPIRED') {
      return 'bg-red-500/10 border-red-400/20 text-red-400'
    }
    if (status === 'CANCELLED') {
      return 'bg-gray-500/10 border-gray-400/20 text-gray-400'
    }
    if (status === 'TRIAL') {
      return 'bg-purple-500/10 border-purple-400/20 text-purple-400'
    }
    if (daysRemaining <= 7) {
      return 'bg-amber-500/10 border-amber-400/20 text-amber-400'
    }
    return 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400'
  }

  const handleAction = async (type: 'upgrade' | 'cancel' | 'extend', subscription: any) => {
    setActionModal({ type, subscription })
  }

  const executeAction = async () => {
    if (!actionModal) return

    try {
      const endpoint = {
        upgrade: '/api/admin/subscriptions',
        cancel: '/api/admin/subscriptions/cancel',
        extend: '/api/admin/subscriptions/extend',
      }[actionModal.type]

      const body = {
        upgrade: { agentId: actionModal.subscription.agentId, plan: 'PREMIUM' },
        cancel: { agentId: actionModal.subscription.agentId },
        extend: { agentId: actionModal.subscription.agentId, extensionDays: 30 },
      }[actionModal.type]

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        router.refresh()
        setActionModal(null)
      } else {
        alert('Action failed. Please try again.')
      }
    } catch (error) {
      alert('Action failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold text-white/95 tracking-tight">Subscriptions</h1>
          <p className="text-[13px] font-medium text-white/50 mt-1">
            Manage agent subscriptions and plan changes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by email, company..."
              value={filters.search}
              onChange={(e) => updateFilters('search', e.target.value)}
              className="w-full h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/90 placeholder:text-white/40 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.06] transition-all"
            />
          </div>

          <div className="w-[140px]">
            <SelectDropdown
              label="Status"
              showLabel={false}
              dense
              variant="dark"
              value={filters.status}
              onChange={(v) => updateFilters('status', v)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'TRIAL', label: 'Trial' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>

          <div className="w-[140px]">
            <SelectDropdown
              label="Plan"
              showLabel={false}
              dense
              variant="dark"
              value={filters.plan}
              onChange={(v) => updateFilters('plan', v)}
              options={[
                { value: '', label: 'All Plans' },
                { value: 'BASIC', label: 'Basic' },
                { value: 'PROFESSIONAL', label: 'Professional' },
                { value: 'PREMIUM', label: 'Premium' },
              ]}
            />
          </div>

          {(filters.status || filters.plan || filters.search) && (
            <button
              onClick={() => {
                setFilters({ status: '', plan: '', search: '' })
                router.push('/admin/financial/subscriptions')
              }}
              className="h-10 px-4 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[13px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Agent</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Plan</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Status</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Expiry</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Days Left</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Started</th>
                <th className="text-right py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => {
                const daysRemaining = getDaysRemaining(subscription.endDate)
                const isExpiring = daysRemaining <= 7 && daysRemaining > 0
                const isExpired = subscription.status === 'EXPIRED' || daysRemaining === 0

                return (
                  <tr
                    key={subscription.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      isExpiring ? 'bg-amber-500/[0.03]' : ''
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/20 flex items-center justify-center">
                          <span className="text-[12px] font-bold text-amber-400">
                            {(subscription.agent?.user?.name || subscription.agent?.user?.email || 'A').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-white/90">
                            {subscription.agent?.company || subscription.agent?.user?.name}
                          </p>
                          <p className="text-[11px] text-white/50">{subscription.agent?.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-white/80">
                        {subscription.plan}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getStatusBadge(subscription.status, subscription.endDate)}`}
                        >
                          {subscription.status}
                        </span>
                        {isExpiring && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/20 text-[10px] font-semibold text-amber-400">
                            Expiring
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[12px] text-white/60">{formatDate(subscription.endDate)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-[13px] font-semibold ${
                          isExpired ? 'text-red-400' : daysRemaining <= 7 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {isExpired ? '0' : daysRemaining}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[12px] text-white/60">{formatDate(subscription.startDate)}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {subscription.status === 'ACTIVE' && subscription.plan !== 'PREMIUM' && (
                          <button
                            onClick={() => handleAction('upgrade', subscription)}
                            className="h-8 px-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                          >
                            Upgrade
                          </button>
                        )}
                        {subscription.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleAction('extend', subscription)}
                            className="h-8 px-3 rounded-lg border border-blue-400/20 bg-blue-500/10 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/20 transition-all"
                          >
                            Extend
                          </button>
                        )}
                        {(subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') && (
                          <button
                            onClick={() => handleAction('cancel', subscription)}
                            className="h-8 px-3 rounded-lg border border-red-400/20 bg-red-500/10 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
            <p className="text-[12px] text-white/50">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} subscriptions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams?.toString() || '')
                  params.set('page', String(pagination.page - 1))
                  router.push(`/admin/financial/subscriptions?${params.toString()}`)
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
                  router.push(`/admin/financial/subscriptions?${params.toString()}`)
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

      {/* Action Modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setActionModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0a1019] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-[17px] font-extrabold text-white/95 tracking-tight mb-2">
                {actionModal.type === 'upgrade' && 'Upgrade Subscription'}
                {actionModal.type === 'cancel' && 'Cancel Subscription'}
                {actionModal.type === 'extend' && 'Extend Subscription'}
              </h2>
              <p className="text-[13px] text-white/60 mb-6">
                {actionModal.type === 'upgrade' && `Upgrade ${actionModal.subscription.agent?.company} to Premium plan?`}
                {actionModal.type === 'cancel' && `Cancel subscription for ${actionModal.subscription.agent?.company}?`}
                {actionModal.type === 'extend' && `Extend subscription for ${actionModal.subscription.agent?.company} by 30 days?`}
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setActionModal(null)}
                  className="h-10 px-6 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[13px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  className="h-10 px-6 rounded-xl bg-amber-500 border border-amber-500/30 text-[13px] font-semibold text-white hover:bg-amber-400 transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SubscriptionsClient(props: SubscriptionsClientProps) {
  return (
    <Suspense fallback={<div className="text-white/50">Loading subscriptions...</div>}>
      <SubscriptionsClientContent {...props} />
    </Suspense>
  )
}
