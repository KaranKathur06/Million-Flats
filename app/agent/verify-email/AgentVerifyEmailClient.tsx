'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AgentVerifyEmailClient({ email }: { email: string }) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const resend = async () => {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'agent' }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data?.message || 'Failed to send. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-dark-blue/10 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-dark-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">Step 1 of 4</p>
          <h1 className="text-2xl font-serif font-bold text-dark-blue mb-3">Verify Your Email</h1>
          <p className="text-gray-600 text-sm mb-2">
            We&apos;ve sent a verification email to:
          </p>
          <p className="font-semibold text-dark-blue mb-6">{email}</p>

          {/* Progress */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
            <div className="h-full bg-dark-blue rounded-full" style={{ width: '10%' }} />
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Click the verification link in your email to continue. Check your spam folder if you don&apos;t see it.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {sent ? (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
              ✓ Verification email sent! Check your inbox.
            </div>
          ) : (
            <button
              onClick={resend}
              disabled={sending}
              className="w-full h-11 bg-dark-blue text-white font-semibold rounded-xl hover:bg-dark-blue/90 disabled:opacity-50 transition-all"
            >
              {sending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          )}

          <div className="mt-6 flex items-center justify-between gap-4">
            <Link href="/agent/verify" className="text-sm text-dark-blue hover:underline">
              Enter OTP instead
            </Link>
            <Link href="/contact" className="text-sm text-gray-500 hover:text-dark-blue">
              Need help?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
