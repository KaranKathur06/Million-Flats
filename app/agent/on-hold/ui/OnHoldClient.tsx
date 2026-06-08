'use client'

import { useRouter } from 'next/navigation'
import { getAgentLifecycleUx, AgentStatus } from '@/lib/agentLifecycle'

export default function OnHoldClient({ status }: { status?: AgentStatus }) {
  const router = useRouter()
  
  const ux = getAgentLifecycleUx({ status })

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    window.location.href = '/agent/login'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden mr-4">
            <div 
              className="h-full bg-dark-blue transition-all duration-500 ease-out" 
              style={{ width: `${ux.progress}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-500">{ux.progress}% Complete</span>
        </div>

        <h1 className="text-2xl font-serif font-bold text-dark-blue">{ux.title}</h1>
        <p className="mt-3 text-gray-700 leading-relaxed">
          {ux.message}
        </p>

        {status === 'UNDER_REVIEW' && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-sm text-gray-700">Expected review time</p>
            <p className="mt-1 text-sm font-semibold text-dark-blue">24–48 hours</p>
            <p className="mt-3 text-sm text-gray-700">Need help?</p>
            <p className="mt-1 text-sm font-semibold text-dark-blue">support@millionflats.com</p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {ux.ctaLabel && (
            <button
              onClick={() => router.push(ux.ctaHref || '/agent/dashboard')}
              className="flex-1 h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors"
            >
              {ux.ctaLabel}
            </button>
          )}
          <button
            onClick={logout}
            className="h-11 px-6 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
