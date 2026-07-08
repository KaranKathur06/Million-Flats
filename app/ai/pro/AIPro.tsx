'use client'

import { useSearchParams } from 'next/navigation'
import { AIProDashboard } from '@/components/aipro/AIProDashboard'
import { AIEmptyState } from '@/components/ai-shared/AISkeletons'

export default function AIPro() {
  const searchParams = useSearchParams()
  const agentId = searchParams?.get('agentId') ?? null

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <div className="bg-[#0a1628] text-white py-10 px-4">
        <div className="container mx-auto max-w-[1400px]">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-400">AIPro™</span>
          <h1 className="text-3xl font-bold mt-1">Agent Intelligence Platform</h1>
          <p className="text-gray-400 mt-1 text-sm">
            AI-powered performance scoring, churn prediction, lead routing &amp; coaching
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1400px] px-4 py-8">
        {agentId ? (
          <AIProDashboard agentId={agentId} />
        ) : (
          <AIEmptyState message="Pass ?agentId= in the URL to load agent intelligence" />
        )}
      </div>
    </div>
  )
}
