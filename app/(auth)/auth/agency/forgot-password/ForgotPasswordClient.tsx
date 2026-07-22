'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

interface FormState {
  email: string
  loading: boolean
  error: string
  success: boolean
  message: string
}

export default function ForgotPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams?.get('email') || ''
  
  const [formState, setFormState] = useState<FormState>({
    email: initialEmail,
    loading: false,
    error: '',
    success: false,
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState((prev) => ({ ...prev, loading: true, error: '', message: '' }))

    try {
      const response = await fetch('/api/agency/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formState.email }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setFormState((prev) => ({
          ...prev,
          success: true,
          message: data.message || 'Password reset link sent to your email. Check your inbox.',
          email: '', // Clear form
        }))
      } else {
        setFormState((prev) => ({
          ...prev,
          error: data.error || 'Failed to send reset link. Please try again.',
        }))
      }
    } catch (err) {
      console.error('[forgot-password] Error:', err)
      setFormState((prev) => ({
        ...prev,
        error: 'An error occurred. Please try again.',
      }))
    } finally {
      setFormState((prev) => ({ ...prev, loading: false }))
    }
  }

  if (formState.success) {
    return (
      <AuthLayout title="Check Your Email" subtitle="Password reset link sent">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Message */}
          <div>
            <p className="text-gray-600 mb-4">
              We've sent a password reset link to your email address. Please check your inbox and click the link to reset your password.
            </p>
            <p className="text-sm text-gray-500">
              The link will expire in 24 hours for security reasons.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
            <p className="text-sm text-blue-900">
              💡 <strong>Tip:</strong> If you don't see the email within a few minutes, check your spam or junk folder.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-3">
            <Link
              href="/agency/login"
              className="block w-full h-10 leading-10 rounded-xl font-medium bg-blue-600 text-white text-center hover:bg-blue-700 transition-all duration-200"
            >
              Back to Sign In
            </Link>
            <button
              type="button"
              onClick={() => {
                setFormState({
                  email: '',
                  loading: false,
                  error: '',
                  success: false,
                  message: '',
                })
              }}
              className="w-full h-10 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-all duration-200"
            >
              Try Another Email
            </button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="We'll help you reset your password securely"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Error Message */}
        {formState.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {formState.error}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How it works</p>
              <p className="text-blue-800">
                Enter your business email address and we'll send you a secure link to reset your password.
              </p>
            </div>
          </div>
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Business Email
          </label>
          <input
            id="email"
            type="email"
            value={formState.email}
            onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="your@company.com"
            disabled={formState.loading}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={formState.loading || !formState.email}
          className="w-full h-10 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
        >
          {formState.loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        {/* Back to Login */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/agency/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
