'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

interface PaymentsClientProps {
  payments: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function PaymentsClientContent({ payments, pagination }: PaymentsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [filters, setFilters] = useState({
    status: searchParams?.get('status') || '',
    plan: searchParams?.get('plan') || '',
    search: searchParams?.get('search') || '',
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    router.push(`/admin/financial/payments?${params.toString()}`)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      CAPTURED: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400',
      FAILED: 'bg-red-500/10 border-red-400/20 text-red-400',
      PENDING: 'bg-amber-500/10 border-amber-400/20 text-amber-400',
      REFUNDED: 'bg-purple-500/10 border-purple-400/20 text-purple-400',
      PARTIALLY_REFUNDED: 'bg-purple-500/10 border-purple-400/20 text-purple-400',
    }
    return styles[status as keyof typeof styles] || styles.PENDING
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold text-white/95 tracking-tight">Payments</h1>
          <p className="text-[13px] font-medium text-white/50 mt-1">
            Manage and monitor all payment transactions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by email, payment ID..."
              value={filters.search}
              onChange={(e) => updateFilters('search', e.target.value)}
              className="w-full h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/90 placeholder:text-white/40 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => updateFilters('status', e.target.value)}
            className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/90 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.06] transition-all"
          >
            <option value="">All Status</option>
            <option value="CAPTURED">Captured</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Plan Filter */}
          <select
            value={filters.plan}
            onChange={(e) => updateFilters('plan', e.target.value)}
            className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/90 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.06] transition-all"
          >
            <option value="">All Plans</option>
            <option value="BASIC">Basic</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="PREMIUM">Premium</option>
          </select>

          {/* Clear Filters */}
          {(filters.status || filters.plan || filters.search) && (
            <button
              onClick={() => {
                setFilters({ status: '', plan: '', search: '' })
                router.push('/admin/financial/payments')
              }}
              className="h-10 px-4 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[13px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Agent</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Plan</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Amount</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Status</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Payment ID</th>
                <th className="text-left py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Date</th>
                <th className="text-right py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelectedPayment(payment)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/20 flex items-center justify-center">
                        <span className="text-[12px] font-bold text-amber-400">
                          {(payment.agent?.user?.name || payment.agent?.user?.email || 'A').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white/90">
                          {payment.agent?.company || payment.agent?.user?.name}
                        </p>
                        <p className="text-[11px] text-white/50">{payment.agent?.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-white/80">
                      {payment.plan}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-[13px] font-semibold text-white/90">
                        {formatCurrency(payment.amountInr)}
                      </p>
                      {payment.amountPaidInr < payment.amountInr && (
                        <p className="text-[11px] text-amber-400">
                          Paid: {formatCurrency(payment.amountPaidInr)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getStatusBadge(payment.status)}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-[12px] font-mono text-white/70">{payment.razorpayPaymentId || payment.razorpayOrderId}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[12px] text-white/60">{formatDate(payment.createdAt)}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPayment(payment)
                      }}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
                    >
                      Details
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
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payments
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams?.toString() || '')
                  params.set('page', String(pagination.page - 1))
                  router.push(`/admin/financial/payments?${params.toString()}`)
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
                  router.push(`/admin/financial/payments?${params.toString()}`)
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

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedPayment(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#0a1019] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-[17px] font-extrabold text-white/95 tracking-tight">Payment Details</h2>
                <p className="text-[12px] text-white/50 mt-1">ID: {selectedPayment.id}</p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="h-8 w-8 rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Agent Info */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                  <span className="text-[14px] font-bold text-amber-400">
                    {(selectedPayment.agent?.user?.name || selectedPayment.agent?.user?.email || 'A').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-white/90">
                    {selectedPayment.agent?.company || selectedPayment.agent?.user?.name}
                  </p>
                  <p className="text-[12px] text-white/50">{selectedPayment.agent?.user?.email}</p>
                </div>
              </div>

              {/* Payment Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Amount</p>
                  <p className="text-[16px] font-extrabold text-white/90">{formatCurrency(selectedPayment.amountInr)}</p>
                  {selectedPayment.amountPaidInr < selectedPayment.amountInr && (
                    <p className="text-[11px] text-amber-400 mt-1">Paid: {formatCurrency(selectedPayment.amountPaidInr)}</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Status</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getStatusBadge(selectedPayment.status)}`}
                  >
                    {selectedPayment.status}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Plan</p>
                  <p className="text-[14px] font-semibold text-white/90">{selectedPayment.plan}</p>
                  <p className="text-[11px] text-white/50 mt-1">{selectedPayment.billingCycle}</p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-1">Created</p>
                  <p className="text-[12px] text-white/70">{formatDate(selectedPayment.createdAt)}</p>
                </div>
              </div>

              {/* Razorpay Details */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Razorpay Details</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[12px] text-white/60">Order ID</span>
                    <span className="text-[12px] font-mono text-white/90">{selectedPayment.razorpayOrderId}</span>
                  </div>
                  {selectedPayment.razorpayPaymentId && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[12px] text-white/60">Payment ID</span>
                      <span className="text-[12px] font-mono text-white/90">{selectedPayment.razorpayPaymentId}</span>
                    </div>
                  )}
                  {selectedPayment.paidAt && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[12px] text-white/60">Paid At</span>
                      <span className="text-[12px] text-white/90">{formatDate(selectedPayment.paidAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Failure Reason */}
              {selectedPayment.status === 'FAILED' && selectedPayment.failureReason && (
                <div className="p-4 rounded-xl bg-red-500/[0.05] border border-red-400/20">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-red-400 mb-1">Failure Reason</p>
                  <p className="text-[13px] text-white/90">{selectedPayment.failureReason}</p>
                  {selectedPayment.failureCode && (
                    <p className="text-[11px] text-white/50 mt-1">Code: {selectedPayment.failureCode}</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedPayment(null)}
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

export default function PaymentsClient(props: PaymentsClientProps) {
  return (
    <Suspense fallback={<div className="text-white/50">Loading payments...</div>}>
      <PaymentsClientContent {...props} />
    </Suspense>
  )
}
