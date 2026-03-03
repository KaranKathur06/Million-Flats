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

  const role = useMemo(() => safeRole(searchParams?.get('role')), [searchParams])
  const email = searchParams?.get('email') || ''
  const next = searchParams?.get('next') || ''
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : ''

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const callbackUrl = safeNext ? `/auth/redirect?next=${encodeURIComponent(safeNext)}` : '/auth/redirect'

  useEffect(() => {
    if (!email) setError('Missing email. Please go back and try again.')
  }, [email])

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
        setError((data && data.message) || 'Verification failed')
        return
      }

      const loginToken = (data && data.loginToken) || ''
      if (!loginToken) {
        setError('Verification failed. Please try again.')
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

      const raw = (result as any)?.error || 'Login failed'
      setError(raw)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Verify OTP" subtitle={`We’ve sent a verification code to ${email || 'your email'}.`}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {info && <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">{info}</div>}

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

        <div className="text-center text-sm text-gray-600">
          <Link href={role === 'agent' ? '/auth/agent/login' : '/auth/user/login'} className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
