'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError((data && data.message) || 'Something went wrong. Please try again.')
        return
      }

      setSuccess('If an account exists, a reset link will be sent to that email.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Enter your email and we’ll send you a reset link.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">{success}</div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>

        <div className="text-center text-sm text-gray-600">
          <Link href="/user/login" className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
