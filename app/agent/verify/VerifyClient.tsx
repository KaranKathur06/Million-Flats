'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, type: 'agent' }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push(`/agent/login?email=${encodeURIComponent(email)}&verified=1`)
      } else {
        setError(data.message || 'Verification failed')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-serif font-bold text-dark-blue">Verify Your Email</h2>
          <p className="mt-2 text-center text-sm text-gray-600">We&apos;ve sent a verification code to {email}</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-dark-blue focus:border-dark-blue sm:text-sm text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-dark-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-blue disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
