'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

function safePath(value: string | null | undefined) {
  if (!value || typeof value !== 'string') return ''
  return value.startsWith('/') ? value : ''
}

export default function AdminLoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams?.get('email') || ''
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const next = safePath(searchParams?.get('next'))
  const redirectUrl = next || '/admin'

  useEffect(() => {
    const authError = searchParams?.get('error')
    if (authError === 'email_not_registered') {
      setError('Email not registered. Please contact the admin team for access.')
    }
  }, [searchParams])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        intent: 'admin',
        redirect: false,
      })

      if (result?.ok) {
        router.push(redirectUrl)
        return
      }

      const rawError = (result as any)?.error || 'Login failed. Please check your credentials.'
      if (rawError === 'ADMIN_ONLY') {
        setError('This account is not authorized for admin access.')
      } else if (rawError === 'INVALID_PASSWORD') {
        setError('Invalid email or password.')
      } else if (rawError === 'EMAIL_NOT_VERIFIED') {
        setError('Please verify your email before signing in.')
      } else if (rawError === 'ACCOUNT_DISABLED') {
        setError('Your account is disabled. Contact support for help.')
      } else if (rawError === 'ACCOUNT_BANNED') {
        setError('Your account is banned. Contact support for help.')
      } else if (rawError === 'PASSWORD_NOT_SET') {
        setError('No password is set for this account. Please reset your password.')
      } else {
        setError(rawError)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Admin Login" subtitle="Sign in with your staff credentials">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="flex-1">{error}</span>
            </div>

            {error === 'Please verify your email before signing in.' && (
              <Link
                href={`/user/verify?email=${encodeURIComponent(email)}`}
                className="block w-full text-center h-12 leading-[3rem] rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 mt-3"
              >
                Verify Email
              </Link>
            )}
          </div>
        ) : null}

        <div>
          <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
            placeholder="admin@example.com"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          <Link
            href="/user/forgot-password"
            className="text-sm font-medium text-dark-blue hover:text-dark-blue/80 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-dark-blue/20"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  )
}
