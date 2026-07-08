'use client'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared AI Intelligence Loading Skeletons
// Used across all 5 AI pages while data is being fetched
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React from 'react'

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] ${className}`}
      style={{ animation: 'shimmer 1.4s ease-in-out infinite', backgroundSize: '400% 100%' }}
    />
  )
}

// ─── Confidence Badge Skeleton ────────────────────────────────────────────────
export function ConfidenceSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Shimmer className="h-6 w-16 rounded-full" />
      <Shimmer className="h-4 w-24" />
    </div>
  )
}

// ─── Price Card Skeleton ──────────────────────────────────────────────────────
export function PriceCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4 shadow-sm">
      <Shimmer className="h-5 w-32" />
      <div className="space-y-2">
        <Shimmer className="h-10 w-48" />
        <Shimmer className="h-4 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1">
            <Shimmer className="h-3 w-12" />
            <Shimmer className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Investment Grade Skeleton ────────────────────────────────────────────────
export function InvestmentGradeSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4 shadow-sm">
      <Shimmer className="h-5 w-40" />
      <div className="flex items-center gap-4">
        <Shimmer className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-8 w-16" />
          <Shimmer className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg bg-gray-50 p-3 space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-5 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Risk Score Skeleton ──────────────────────────────────────────────────────
export function RiskScoreSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4 shadow-sm">
      <Shimmer className="h-5 w-28" />
      <div className="flex items-center gap-4">
        <Shimmer className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-2 w-full rounded-full" />
          <Shimmer className="h-2 w-3/4 rounded-full" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Shimmer className="h-4 w-4 rounded-full mt-1 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Comparables Table Skeleton ───────────────────────────────────────────────
export function ComparablesSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3 shadow-sm">
      <Shimmer className="h-5 w-40" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-50">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-4 w-20 ml-auto" />
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Chart Skeleton ───────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <Shimmer className="h-5 w-36 mb-4" />
      <div className="w-full rounded-lg animate-pulse bg-gray-200" style={{ height }} />
    </div>
  )
}

// ─── Media Grid Skeleton ──────────────────────────────────────────────────────
export function MediaGridSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4 shadow-sm">
      <Shimmer className="h-5 w-36" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="relative">
            <Shimmer className="aspect-video w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Full Page AI Loading Skeleton ────────────────────────────────────────────
export function AIPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Hero */}
      <div className="h-48 bg-[#0a1628]" />

      <div className="container mx-auto max-w-[1400px] px-4 py-8 space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <PriceCardSkeleton />
            <RiskScoreSkeleton />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <InvestmentGradeSkeleton />
            <ChartSkeleton height={240} />
          </div>
        </div>
        <ComparablesSkeleton />
      </div>
    </div>
  )
}

// ─── Inline Insight Skeleton (for panel use) ──────────────────────────────────
export function AIInsightSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Shimmer className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-3 w-20" />
        </div>
        <Shimmer className="h-6 w-16 rounded-full" />
      </div>
      <Shimmer className="h-2 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-2">
        <Shimmer className="h-10 rounded-lg" />
        <Shimmer className="h-10 rounded-lg" />
      </div>
    </div>
  )
}

// ─── AI Error State ───────────────────────────────────────────────────────────
export function AIErrorState({
  message = 'AI analysis temporarily unavailable',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center space-y-3">
      <div className="text-2xl">⚠️</div>
      <p className="text-sm font-medium text-red-700">{message}</p>
      <p className="text-xs text-red-500">
        Our AI engines are processing. Results will appear shortly.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}

// ─── AI Empty State ───────────────────────────────────────────────────────────
export function AIEmptyState({ message = 'No AI data available yet' }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center space-y-2">
      <div className="text-3xl">🤖</div>
      <p className="text-sm font-medium text-gray-600">{message}</p>
      <p className="text-xs text-gray-400">
        Select a property to run AI analysis
      </p>
    </div>
  )
}
