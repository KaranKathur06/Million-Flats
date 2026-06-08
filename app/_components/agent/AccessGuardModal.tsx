'use client'

import { useState, useEffect } from 'react'
import { AccessCheckResult } from '@/lib/agentRouteGuard'

interface AccessGuardModalProps {
  isOpen: boolean
  onClose: () => void
  accessResult: AccessCheckResult
  featureName: string
}

// Inline SVG icons
const Icons = {
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  ),
  AlertCircle: () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ClockSmall: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  FileText: () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

const colorMap: Record<string, string> = {
  profile_incomplete: 'text-blue-500 bg-blue-50',
  documents_not_uploaded: 'text-blue-500 bg-blue-50',
  under_review: 'text-amber-500 bg-amber-50',
  not_approved: 'text-gray-500 bg-gray-50',
  rejected: 'text-red-500 bg-red-50',
  suspended: 'text-red-500 bg-red-50',
}

export default function AccessGuardModal({
  isOpen,
  onClose,
  accessResult,
  featureName,
}: AccessGuardModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isVisible && !isOpen) return null

  const Icon = accessResult.reason ? iconMap[accessResult.reason] : Icons.Lock
  const colorClass = accessResult.reason ? colorMap[accessResult.reason] : 'text-gray-500 bg-gray-50'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Icons.X />
          </button>

          {/* Icon */}
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${colorClass}`}>
            <Icon />
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {accessResult.reason === 'under_review'
              ? 'Feature Pending'
              : accessResult.reason === 'suspended'
              ? 'Account Suspended'
              : accessResult.reason === 'rejected'
              ? 'Application Rejected'
              : 'Feature Locked'}
          </h2>

          {/* Feature name badge */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              {featureName}
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="px-6 pb-4">
          <p className="text-gray-600 text-center leading-relaxed">
            {accessResult.message}
          </p>
        </div>

        {/* Progress indicator for under_review */}
        {accessResult.reason === 'under_review' && (
          <div className="px-6 pb-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Icons.ClockSmall />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Review in progress</p>
                  <p className="text-xs text-amber-600 mt-0.5">Usually takes 1-2 business days</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <a
            href={accessResult.primaryAction.href}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25"
          >
            {accessResult.primaryAction.label}
            <Icons.ArrowRight />
          </a>

          {accessResult.secondaryAction && (
            <a
              href={accessResult.secondaryAction.href}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              {accessResult.secondaryAction.label}
            </a>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Stay on current page
          </button>
        </div>
      </div>
    </div>
  )
}
