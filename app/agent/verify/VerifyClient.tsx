'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import OtpCodeInput from '@/components/OtpCodeInput'
import { useEffect } from 'react'

export default function VerifyClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sentLink, setSentLink] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)

  useEffect(() => {
    let mounted = true
    async function autoSend() {
      if (!email) return
      try {
        const res = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type: 'agent' }),
        })
        if (!mounted) return
        if (res.ok) setSentLink(true)
      } catch {
        // ignore
      }
    }
    autoSend()
    return () => {
      mounted = false
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, type: 'agent' }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        router.push('/agent/onboarding')
      } else {
        setError(data.message || 'Verification failed')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white/95 shadow-2xl shadow-slate-200/60 p-8 backdrop-blur-sm">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Agent verification</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Verify your email</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{email}</span>.
          </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-3">
              Verification code
            </label>
            <OtpCodeInput value={otp} onChange={setOtp} />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="flex h-14 w-full items-center justify-center rounded-3xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify email'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Didn&apos;t receive a code? Please check your spam folder or try again in a few minutes.
          </p>
          {sentLink ? (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-sm text-center">
              ✓ Verification code sent! Check your email.
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={async () => {
                  if (!email) return setError('Missing email')
                  setSendingLink(true)
                  try {
                    const res = await fetch('/api/auth/resend-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email, type: 'agent' }),
                    })
                    if (res.ok) setSentLink(true)
                    else setError('Failed to send verification code')
                  } catch {
                    setError('Network error')
                  } finally {
                    setSendingLink(false)
                  }
                }}
                disabled={sendingLink}
                className="w-full h-11 bg-transparent border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-60"
              >
                {sendingLink ? 'Sending...' : 'Resend verification code'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
