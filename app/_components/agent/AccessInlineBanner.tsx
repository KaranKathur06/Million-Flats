'use client'

import { AccessCheckResult } from '@/lib/agentRouteGuard'

interface AccessInlineBannerProps {
  accessResult: AccessCheckResult
  featureName: string
  className?: string
}

// Inline SVG icons
const Icons = {
  Lock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  AlertCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  FileText: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  ),
}

const iconMap: Record<string, () => JSX.Element> = {
  profile_incomplete: Icons.FileText,
  documents_not_uploaded: Icons.FileText,
  under_review: Icons.Clock,
  not_approved: Icons.Lock,
  rejected: Icons.AlertCircle,
  suspended: Icons.AlertCircle,
}

const bgMap: Record<string, string> = {
  profile_incomplete: 'bg-blue-50 border-blue-200',
  documents_not_uploaded: 'bg-blue-50 border-blue-200',
  under_review: 'bg-amber-50 border-amber-200',
  not_approved: 'bg-gray-50 border-gray-200',
  rejected: 'bg-red-50 border-red-200',
  suspended: 'bg-red-50 border-red-200',
}

const textColorMap: Record<string, string> = {
  profile_incomplete: 'text-blue-800',
  documents_not_uploaded: 'text-blue-800',
  under_review: 'text-amber-800',
  not_approved: 'text-gray-800',
  rejected: 'text-red-800',
  suspended: 'text-red-800',
}

const iconColorMap: Record<string, string> = {
  profile_incomplete: 'text-blue-500',
  documents_not_uploaded: 'text-blue-500',
  under_review: 'text-amber-500',
  not_approved: 'text-gray-500',
  rejected: 'text-red-500',
  suspended: 'text-red-500',
}

const btnBgMap: Record<string, string> = {
  profile_incomplete: 'bg-blue-600 hover:bg-blue-700',
  documents_not_uploaded: 'bg-blue-600 hover:bg-blue-700',
  under_review: 'bg-amber-600 hover:bg-amber-700',
  not_approved: 'bg-gray-600 hover:bg-gray-700',
  rejected: 'bg-red-600 hover:bg-red-700',
  suspended: 'bg-red-600 hover:bg-red-700',
}

export default function AccessInlineBanner({
  accessResult,
  featureName,
  className = '',
}: AccessInlineBannerProps) {
  if (accessResult.canAccess) return null

  const reason = accessResult.reason || 'not_approved'
  const Icon = iconMap[reason] || Icons.Lock
  const bgClass = bgMap[reason] || 'bg-gray-50 border-gray-200'
  const textClass = textColorMap[reason] || 'text-gray-800'
  const iconClass = iconColorMap[reason] || 'text-gray-500'
  const btnClass = btnBgMap[reason] || 'bg-gray-600 hover:bg-gray-700'

  return (
    <div className={`rounded-xl border p-4 ${bgClass} ${className}`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 ${iconClass}`}>
          <Icon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${textClass}`}>{featureName}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/50 text-gray-600">
              Locked
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {accessResult.message}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={accessResult.primaryAction.href}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${btnClass}`}
            >
              {accessResult.primaryAction.label}
              <Icons.ArrowRight />
            </a>
            {accessResult.secondaryAction && (
              <a
                href={accessResult.secondaryAction.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {accessResult.secondaryAction.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
