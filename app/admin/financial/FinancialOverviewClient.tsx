'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FinancialOverviewClientProps {
  totalRevenue: number
  monthlyRevenue: number
  activeSubscriptions: number
  failedPayments: number
  trialUsers: number
  recentPayments: any[]
  revenueByDay: Array<{ date: string; revenue: number }>
}

export default function FinancialOverviewClient({
  totalRevenue,
  monthlyRevenue,
  activeSubscriptions,
  failedPayments,
  trialUsers,
  recentPayments,
  revenueByDay,
}: FinancialOverviewClientProps) {
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
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold text-white/95 tracking-tight">Financial Overview</h1>
          <p className="text-[13px] font-medium text-white/50 mt-1">Monitor revenue, payments, and subscription metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/financial/payments"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[13px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all duration-200"
          >
            View All Payments
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/[0.12] to-emerald-600/[0.03] border border-emerald-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-300/80 mb-2">Total Revenue</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/[0.12] to-blue-600/[0.03] border border-blue-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-300/80 mb-2">Monthly Revenue</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">{formatCurrency(monthlyRevenue)}</p>
            </div>
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-blue-400/10 border border-blue-400/20">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/[0.12] to-amber-600/[0.03] border border-amber-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-300/80 mb-2">Active Subscriptions</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">{activeSubscriptions}</p>
            </div>
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-amber-400/10 border border-amber-400/20">
              <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Failed Payments */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/[0.12] to-red-600/[0.03] border border-red-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-red-300/80 mb-2">Failed Payments</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">{failedPayments}</p>
            </div>
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-red-400/10 border border-red-400/20">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Trial Users */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/[0.12] to-purple-600/[0.03] border border-purple-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-purple-300/80 mb-2">Trial Users</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">{trialUsers}</p>
            </div>
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-purple-400/10 border border-purple-400/20">
              <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[17px] font-extrabold text-white/95 tracking-tight">Revenue Trend (30 Days)</h2>
            <p className="text-[12px] font-medium text-white/50 mt-1">Daily revenue from successful payments</p>
          </div>
        </div>

        {/* Simple Chart Visualization */}
        <div className="h-[200px] flex items-end gap-1">
          {revenueByDay.map((day, index) => {
            const maxRevenue = Math.max(...revenueByDay.map((d) => d.revenue))
            const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
            const isToday = index === revenueByDay.length - 1

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-2 group"
                title={`${formatDate(day.date)}: ${formatCurrency(day.revenue)}`}
              >
                <div className="relative w-full flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-200 group-hover:opacity-80 ${
                      isToday
                        ? 'bg-gradient-to-t from-emerald-500/60 to-emerald-400/80 shadow-lg shadow-emerald-500/20'
                        : 'bg-gradient-to-t from-emerald-500/30 to-emerald-400/50'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-white/40 group-hover:text-white/70 transition-colors">
                  {new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[17px] font-extrabold text-white/95 tracking-tight">Recent Payments</h2>
            <p className="text-[12px] font-medium text-white/50 mt-1">Latest payment transactions</p>
          </div>
          <Link
            href="/admin/financial/payments"
            className="text-[12px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Agent</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Plan</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Amount</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Status</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/20 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-amber-400">
                          {(payment.agent?.user?.name || payment.agent?.user?.email || 'A').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white/90">{payment.agent?.company || payment.agent?.user?.name}</p>
                        <p className="text-[11px] text-white/50">{payment.agent?.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-white/80">
                      {payment.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[13px] font-semibold text-white/90">{formatCurrency(payment.amountInr)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                        payment.status === 'CAPTURED'
                          ? 'bg-emerald-500/10 border border-emerald-400/20 text-emerald-400'
                          : payment.status === 'FAILED'
                          ? 'bg-red-500/10 border border-red-400/20 text-red-400'
                          : 'bg-amber-500/10 border border-amber-400/20 text-amber-400'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[12px] text-white/60">{formatDate(payment.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
