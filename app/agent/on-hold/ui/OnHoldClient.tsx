'use client'

import { useRouter } from 'next/navigation'

export default function OnHoldClient() {
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    router.push('/agent/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8">
        <h1 className="text-2xl font-serif font-bold text-dark-blue">Profile Under Review</h1>
        <p className="mt-3 text-gray-700">
          Your agent profile is under review. Our team is verifying your credentials.
        </p>
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-700">Expected review time</p>
          <p className="mt-1 text-sm font-semibold text-dark-blue">24–48 hours</p>
          <p className="mt-3 text-sm text-gray-700">Need help?</p>
          <p className="mt-1 text-sm font-semibold text-dark-blue">support@millionflats.com</p>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/agent/onboarding')}
            className="flex-1 h-11 rounded-xl bg-dark-blue text-white font-semibold"
          >
            Continue Setup
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
