'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

export default function DeveloperLoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResetCta, setShowResetCta] = useState(false)

  const next = searchParams?.get('next')
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : ''

  useEffect(() => {
    const authError = searchParams?.get('error')
    if (authError === 'not_registered') setError('This account is not registered as a developer. Register your company to continue.')
    if (authError === 'developer_not_registered') setError('This account is not registered as a developer.')
    if (authError === 'email_not_registered') setError('Email not registered. Please create a developer account first.')
    if (authError === 'account_disabled') setError('Your account is disabled. Please contact support.')
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setShowResetCta(false)

    try {
      const res = await fetch('/api/auth/login-otp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password, intent: 'developer' }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const code = (data && data.code) || ''
        const msg = (data && data.message) || 'Login failed. Please check your credentials.'
        setError(msg)
        if (code === 'PASSWORD_NOT_SET') setShowResetCta(true)
        return
      }

      const url = `/auth/verify-otp?role=developer&email=${encodeURIComponent(formData.email)}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ''}`
      router.push(url)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Developer Portal" subtitle="Sign in to manage your projects, leads, and company profile">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {showResetCta && (
          <Link
            href={`/user/forgot-password?email=${encodeURIComponent(formData.email)}`}
            className="block w-full text-center h-12 leading-[3rem] rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200"
          >
            Reset Password
          </Link>
        )}

        {/* Business Email */}
        <div>
          <label htmlFor="dev-email" className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
          <input
            id="dev-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
            placeholder="Enter your business email"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="dev-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <div className="relative">
            <input
              id="dev-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all pr-12"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-gray-400 hover:text-gray-600 inline-flex items-center justify-center"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link href="/developer/forgot-password" className="text-sm font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-dark-blue/20"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have a developer account?{' '}
          <Link href="/developer/register" className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
            Register your company
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
