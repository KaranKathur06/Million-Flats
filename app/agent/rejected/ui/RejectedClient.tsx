'use client'

import { useRouter } from 'next/navigation'

export default function RejectedClient() {
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    router.push('/agent/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8">
        <h1 className="text-2xl font-serif font-bold text-dark-blue">Application Rejected</h1>
        <p className="mt-3 text-gray-700">
          Your agent application was rejected. If you believe this is a mistake, please contact support.
        </p>
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Support</p>
          <p className="mt-1 text-sm text-red-800">support@millionflats.com</p>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/agent/register')}
            className="flex-1 h-11 rounded-xl bg-dark-blue text-white font-semibold"
          >
            Re-Apply
          </button>
          <button
            onClick={logout}
            className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
