'use client'

import React from 'react'
import Link from 'next/link'
import { AgentStatus, getAgentLifecycleUx } from '@/lib/agentLifecycle'

interface ModuleLockProps {
  status: AgentStatus
  moduleName: string
  children: React.ReactNode
  isLocked: boolean
}

export function ModuleLock({ status, moduleName, children, isLocked }: ModuleLockProps) {
  if (!isLocked) return <>{children}</>

  const ux = getAgentLifecycleUx({ status })

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 min-h-[400px]">
      {/* Blurred background content (un-interactable) */}
      <div className="absolute inset-0 blur-sm opacity-40 pointer-events-none select-none">
        {children}
      </div>

      {/* Lock Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-white/60 backdrop-blur-sm">
        <div className="w-16 h-16 bg-dark-blue/10 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-dark-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        h2 className="text-xl font-bold text-dark-blue mb-2"
        {moduleName} Locked
      </div>
      <p className="text-gray-600 max-w-sm mb-6">
        You cannot access this feature until your profile is approved. {ux.message}
      </p>

      {ux.ctaLabel && ux.ctaHref && (
        <Link
          href={ux.ctaHref}
          className="px-6 py-2.5 bg-dark-blue text-white font-semibold rounded-xl hover:bg-dark-blue/90 transition-colors shadow-sm"
        >
          {ux.ctaLabel}
        </Link>
      )}
    </div>
  )
}
