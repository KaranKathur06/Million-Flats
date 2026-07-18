'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import OtpCodeInput from '@/components/OtpCodeInput'
import TurnstileCaptcha from '@/components/TurnstileCaptcha'

export default function VerifyClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sentLink, setSentLink] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [requireCaptcha, setRequireCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || ''

  useEffect(() => {
    let mounted = true
    async function checkCaptcha() {
      if (!email) return
      try {
        const res = await fetch(`/api/auth/resend/captcha-status?email=${encodeURIComponent(email)}`)
        const d = await res.json().catch(() => ({}))
        if (!mounted) return
        const needs = Boolean(d?.requireCaptcha)
        setRequireCaptcha(needs)

        // If captcha not required, automatically send a fresh OTP when arriving via verify link
        if (!needs) {
          // attempt to resend OTP once
          try {
            const r = await fetch('/api/auth/resend-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, type: 'user' }),
            })
            if (r.ok) {
              setSentLink(true)
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
    checkCaptcha()
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
        body: JSON.stringify({ email, otp, type: 'user' }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        router.push(`/user/login?email=${encodeURIComponent(email)}&verified=1`)
      } else {
        setError(data.message || 'Verification failed')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return setError('Missing email')
    if (requireCaptcha && !captchaToken) return setError('Please complete the captcha challenge')

    setSendingLink(true)
    setError('')
    try {
      const body: any = { email, type: 'user' }
      if (requireCaptcha) body.captchaResponse = captchaToken

      // Resend a fresh numeric OTP
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSentLink(true)
      } else {
        const d = await res.json().catch(() => ({}))
        if (d?.requireCaptcha) setRequireCaptcha(true)
        setError(d?.message || 'Failed to send verification link')
      }
    } catch {
      setError('Network error')
    } finally {
      setSendingLink(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white/95 shadow-2xl shadow-slate-200/60 p-8 backdrop-blur-sm">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Secure verification</p>
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
            Didn&apos;t receive a code? Please check your spam folder or try again.
          </p>

          {sentLink ? (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-sm text-center">
              ✓ Verification link sent! Check your email.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {requireCaptcha && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800 mb-3">Please verify you are not a robot</p>
                  <TurnstileCaptcha
                    siteKey={turnstileKey}
                    requireCaptcha={requireCaptcha}
                    onVerify={(token) => {
                      setCaptchaToken(token)
                      setCaptchaError('')
                    }}
                    onExpire={() => setCaptchaToken('')}
                  />
                  {captchaError && <p className="mt-2 text-sm text-red-600">{captchaError}</p>}
                </div>
              )}

              <button
                onClick={handleResend}
                disabled={sendingLink}
                className="w-full h-11 bg-transparent border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-60"
              >
                {sendingLink ? 'Sending...' : 'Resend verification link'}
              </button>

              {requireCaptcha && (
                <p className="text-xs text-slate-500">For your safety we require a captcha challenge before sending another verification email.</p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
