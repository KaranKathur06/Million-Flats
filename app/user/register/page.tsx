'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import OtpCodeInput from '@/components/OtpCodeInput'
import { trackEvent } from '@/lib/tracking'
import { POST_LOGIN_ACTION_KEY } from '@/lib/leadMagnets/constants'
import PasswordInput from '@/components/forms/PasswordInput'

export default function UserRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [stage, setStage] = useState<'form' | 'verify'>('form')
  const [verifyEmail, setVerifyEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const normalizedEmail = useMemo(() => (formData.email || '').trim().toLowerCase(), [formData.email])

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const t = window.setInterval(() => {
      setCooldownSeconds((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => window.clearInterval(t)
  }, [cooldownSeconds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!acceptedTerms) {
      setError('Please accept the terms and privacy policy')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type: 'user' }),
      })

      const data = await res.json()

      if (res.ok) {
        if (typeof window !== 'undefined' && window.localStorage.getItem(POST_LOGIN_ACTION_KEY)) {
          trackEvent('signup_complete', { source: 'lead_magnet_gate' })
          fetch('/api/analytics/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'signup_complete',
              payload: { source: 'lead_magnet_gate' },
              path: window.location.pathname,
            }),
            keepalive: true,
          }).catch(() => null)
        }
        const to = data?.redirectTo && typeof data.redirectTo === 'string' ? data.redirectTo : '/user/onboarding'
        router.push(to)
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    try {
      const email = (verifyEmail || normalizedEmail).trim().toLowerCase()
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, type: 'user' }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError((data && data.message) || 'Verification failed')
        return
      }

      router.push(`/auth/user/login?email=${encodeURIComponent(email)}&verified=1`)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldownSeconds > 0) return
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const email = (verifyEmail || normalizedEmail).trim().toLowerCase()
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'user' }),
      })

      await res.json().catch(() => null)

      setCooldownSeconds(60)
      setInfo(`If an account exists for ${email}, a new code has been sent.`)
    } catch {
      setInfo('If an account exists, a new code has been sent.')
      setCooldownSeconds(60)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Save properties, book tours, and receive personalized recommendations"
    >
      {stage === 'verify' ? (
        <form className="space-y-4" onSubmit={handleVerify}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          {info && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">{info}</div>
          )}

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Verification code
            </label>
            <OtpCodeInput value={otp} onChange={setOtp} />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full h-10 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-dark-blue/20"
          >
            {loading ? 'Verifying…' : 'Verify Email'}
          </button>

          <button
            type="button"
            disabled={loading || cooldownSeconds > 0}
            onClick={handleResend}
            className="w-full h-10 border border-gray-300 rounded-xl font-semibold text-dark-blue hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : 'Resend code'}
          </button>

          <div className="text-center text-sm text-gray-600">
            <button
              type="button"
              onClick={() => {
                setStage('form')
                setOtp('')
                setError('')
                setInfo('')
                setCooldownSeconds(0)
              }}
              className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors"
            >
              Back
            </button>
          </div>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
              {info}
            </div>
          )}

        {/* Full Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full h-10 px-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
            placeholder="Enter your full name"
          />
        </div>

        {/* Email */}
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
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full h-10 px-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
            placeholder="Enter your email"
          />
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={formData.password}
          onChange={(value) => setFormData({ ...formData, password: value })}
          placeholder="Create a password"
          autoComplete="new-password"
          confirmValue={formData.confirmPassword}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
          placeholder="Confirm your password"
          autoComplete="new-password"
          confirmValue={formData.password}
        />


        {/* Terms & Privacy */}
        <div className="flex items-start">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 text-dark-blue focus:ring-dark-blue border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
            I agree to the{' '}
            <Link href="/terms" className="text-dark-blue hover:underline">
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-dark-blue hover:underline">
              Privacy Policy
            </Link>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-dark-blue/20"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Account...
            </span>
          ) : (
            'Create User Account'
          )}
        </button>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/user/login" className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
            Sign in
          </Link>
        </p>
        </form>
      )}
    </AuthLayout>
  )
}
