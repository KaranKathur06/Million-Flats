'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import AuthLayout from '@/components/AuthLayout'

function safeRole(v: string | null) {
  const s = String(v || '').toLowerCase()
  if (s === 'agent' || s === 'user') return s
  return 'user'
}

export default function VerifyOtpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const role = useMemo(() => safeRole(searchParams ? searchParams.get('role') : null), [searchParams])
  const email = searchParams?.get('email') || ''
  const next = searchParams?.get('next') || ''
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : ''

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Resend Timer State
  const [resendCooldown, setResendCooldown] = useState(30)
  const [isResendDisabled, setIsResendDisabled] = useState(true)

  const callbackUrl = safeNext ? `/auth/redirect?next=${encodeURIComponent(safeNext)}` : '/auth/redirect'

  useEffect(() => {
    if (!email) setError('Missing email. Please go back and try again.')
  }, [email])

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (resendCooldown > 0 && isResendDisabled) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    } else if (resendCooldown === 0) {
      setIsResendDisabled(false)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown, isResendDisabled])

  const handleResend = async () => {
    if (!email || isResendDisabled) return

    setIsResendDisabled(true)
    setError('')
    setInfo('')

    try {
      const res = await fetch('/api/auth/login-otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: role.toUpperCase() }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        // Specifically catch the cooldown error to resync frontend timer based on backend time if necessary
        if (data?.code === 'COOLDOWN_ACTIVE') {
          setError(data.message)
          setInfo('')
          // We could parse the remaining seconds from message, but safely keeping it at 30 works for UI simplicity
          setResendCooldown(30)
        } else {
          setError((data && data.message) || 'Failed to resend OTP.')
          setIsResendDisabled(false) // Let them try again if it completely failed
        }
        return
      }

      setInfo('A new OTP has been sent to your email.')
      setOtp('')
      setResendCooldown(30)
    } catch {
      setError('A network error occurred while resending. Please try again.')
      setIsResendDisabled(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    try {
      const res = await fetch('/api/auth/login-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, role: role.toUpperCase() }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        let msg = data?.message || 'Verification failed.'
        // More descriptive error mapping based on backend codes
        if (data?.code === 'OTP_INVALID') msg = 'Invalid OTP. Please check the code and try again.'
        if (data?.code === 'OTP_LOCKED') msg = 'Too many failed attempts. Please request a new OTP.'
        if (data?.code === 'RATE_LIMITED') msg = 'Too many attempts. Please try again later.'

        setError(msg)
        return
      }

      const loginToken = (data && data.loginToken) || ''
      if (!loginToken) {
        setError('Verification system issue. Please try again.')
        return
      }

      const result = await signIn('credentials', {
        email,
        loginToken,
        intent: role,
        redirect: false,
        callbackUrl,
      })

      if (result?.ok && result.url) {
        router.push(result.url)
        return
      }

      const raw = (result as any)?.error || 'Login session failed'
      // Handle the NextAuth specifically mapped backend errors
      if (raw === 'EMAIL_NOT_VERIFIED') {
        setError('System error setting email verification status.')
      } else {
        setError(raw)
      }
    } catch {
      setError('An error occurred verifying your code. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Verify OTP" subtitle={`We’ve sent a verification code to ${email || 'your email'}.`}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {info && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium">{info}</div>}

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
            className="appearance-none relative block w-full h-12 px-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-dark-blue focus:border-dark-blue text-center text-2xl tracking-widest"
            placeholder="000000"
          />
        </div>

        <button
          type="submit"
          disabled={loading || otp.length !== 6 || !email}
          className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verifying…' : 'Verify & Sign In'}
        </button>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 pb-2 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResendDisabled || !email}
            className={`font-medium transition-colors ${isResendDisabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-dark-blue hover:text-dark-blue/80'
              }`}
          >
            {isResendDisabled ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
          </button>

          <Link href={role === 'agent' ? '/auth/agent/login' : '/auth/user/login'} className="font-medium text-gray-600 hover:text-gray-900 transition-colors mt-3 sm:mt-0">
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
