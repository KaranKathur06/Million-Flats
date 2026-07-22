'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import AuthLayout from '@/components/AuthLayout'

export default function AuthAgencyLoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams?.get('email') || ''
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const next = searchParams?.get('next')
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : ''
  const callbackUrl = safeNext ? `/auth/redirect?next=${encodeURIComponent(safeNext)}` : '/agency/dashboard'

  useEffect(() => {
    const authError = searchParams?.get('error')
    if (authError === 'email_not_registered') {
      setError('Email not registered. Please register first.')
    }

    const verified = searchParams?.get('verified')
    if (verified === '1') {
      setError('Email verified successfully. Please sign in to continue.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        intent: 'agency',
        redirect: false,
        callbackUrl,
      })

      if (result?.ok && result.url) {
        router.push(result.url)
        return
      }

      const raw = (result as any)?.error || 'Login failed'
      if (raw === 'EMAIL_NOT_VERIFIED') setError('Please verify your email before signing in.')
      else if (raw === 'INVALID_PASSWORD') setError('Invalid email or password.')
      else if (raw === 'PASSWORD_NOT_SET') setError('Password is not set for this account. Please reset your password.')
      else if (raw === 'ACCOUNT_BANNED') setError('Your account has been banned. Please contact support.')
      else if (raw === 'ACCOUNT_DISABLED') setError('Your account is suspended. Please contact support.')
      else if (raw === 'CredentialsSignin') setError('Invalid email or password.')
      else if (raw === 'AGENCY_NOT_REGISTERED') setError('Agency account not found. Please register first.')
      else setError(raw)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Agency Sign In" subtitle="Scale your agency on MillionFlats">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {error === 'Please verify your email before signing in.' && (
          <Link
            href={`/agency/verify-otp?email=${encodeURIComponent(email)}`}
            className="block w-full text-center h-10 leading-10 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
          >
            Verify Email
          </Link>
        )}

        {error === 'Password is not set for this account. Please reset your password.' && (
          <Link
            href={`/auth/agency/forgot-password?email=${encodeURIComponent(email)}`}
            className="block w-full text-center h-10 leading-10 rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200"
          >
            Reset Password
          </Link>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Business Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@agency.com"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            required
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Link
              href={`/agency/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
            Remember me for 30 days
          </label>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full h-10 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 transition-all duration-200"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/agency/register" className="font-medium text-blue-600 hover:text-blue-700">
            Register here
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
