'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'

export default function ResetPasswordClient() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams?.get('token') || '', [searchParams])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setError('')
    setSuccess(false)
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError((data && data.message) || 'Reset failed. Please try again.')
        return
      }

      setSuccess(true)
    } catch {
      setError('Reset failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Choose a new password for your account.">
      {success ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
            Password updated successfully. You can now sign in.
          </div>
          <Link
            href="/user/login"
            className="w-full h-12 inline-flex items-center justify-center bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 transition-all"
          >
            Go to login
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {!token ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              Missing reset token.
            </div>
          ) : null}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
              placeholder="Enter a new password"
              disabled={!token}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
              placeholder="Re-enter your new password"
              disabled={!token}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating…' : 'Reset Password'}
          </button>

          <div className="text-center text-sm text-gray-600">
            <Link href="/user/login" className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
              Back to login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
