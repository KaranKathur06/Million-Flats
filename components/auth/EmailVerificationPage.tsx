'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import OtpCodeInput from '@/components/OtpCodeInput'
import Link from 'next/link'

// ──────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────

interface EmailVerificationPageProps {
  /** Portal type identifier sent to API */
  portalType: 'user' | 'agent' | 'developer' | 'agency'
  /** Display label for the portal */
  portalLabel: string
  /** CSS accent color for branding */
  accentColor?: string
  /** User's email (from search params or server) */
  email: string
  /** Where to redirect on successful verification */
  redirectOnSuccess: string
  /** Custom subtitle text */
  subtitle?: string
}

// ──────────────────────────────────────────────────────────────────────────
// ERROR CODE MAPPING (mirrors backend VerificationErrorCode)
// ──────────────────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  OTP_INVALID: 'Incorrect verification code. Please check and try again.',
  OTP_EXPIRED: 'This code has expired. Click "Resend" to get a new one.',
  OTP_MAX_ATTEMPTS: 'Too many failed attempts. Please request a new code.',
  OTP_ALREADY_USED: 'This code has already been used. Request a new one.',
  ACCOUNT_LOCKED: 'Account temporarily locked. Please try again in 15 minutes.',
  ALREADY_VERIFIED: 'Your email is already verified! Redirecting to login…',
  MISSING_FIELDS: 'Email and verification code are required.',
  INVALID_FORMAT: 'Please enter a valid 6-digit code.',
  RATE_LIMITED: 'Too many requests. Please wait before trying again.',
  COOLDOWN_ACTIVE: 'A code was recently sent. Please check your inbox.',
}

function getErrorMessage(data: any): string {
  if (data?.code && ERROR_MESSAGES[data.code]) return ERROR_MESSAGES[data.code]
  if (data?.message) return data.message
  return 'Verification failed. Please try again.'
}

// ──────────────────────────────────────────────────────────────────────────
// COUNTDOWN HOOK
// ──────────────────────────────────────────────────────────────────────────

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(initialSeconds > 0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isRunning || seconds <= 0) {
      setIsRunning(false)
      return
    }
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setIsRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, seconds])

  const restart = useCallback((s: number) => {
    setSeconds(s)
    setIsRunning(true)
  }, [])

  return { seconds, isRunning, restart }
}

// ──────────────────────────────────────────────────────────────────────────
// PORTAL CONFIG
// ──────────────────────────────────────────────────────────────────────────

const PORTAL_CONFIGS: Record<string, { icon: string; gradient: string; badgeColor: string }> = {
  user: {
    icon: '👤',
    gradient: 'from-slate-50 via-white to-slate-100',
    badgeColor: 'text-slate-500',
  },
  agent: {
    icon: '🏠',
    gradient: 'from-slate-50 via-white to-blue-50/30',
    badgeColor: 'text-blue-600',
  },
  developer: {
    icon: '🏗️',
    gradient: 'from-slate-50 via-white to-indigo-50/30',
    badgeColor: 'text-indigo-600',
  },
  agency: {
    icon: '🏢',
    gradient: 'from-slate-50 via-white to-amber-50/30',
    badgeColor: 'text-amber-600',
  },
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────

export default function EmailVerificationPage({
  portalType,
  portalLabel,
  email,
  redirectOnSuccess,
  subtitle,
}: EmailVerificationPageProps) {
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [initialSendDone, setInitialSendDone] = useState(false)

  const config = PORTAL_CONFIGS[portalType] || PORTAL_CONFIGS.user

  // OTP expiry countdown (10 minutes)
  const expiryTimer = useCountdown(0)
  // Resend cooldown (30 seconds)
  const resendCooldown = useCountdown(0)

  // Start expiry timer on mount — DO NOT auto-resend.
  // Registration already sent the OTP. Auto-resending would invalidate it,
  // causing the user's code to be rejected as "incorrect".
  useEffect(() => {
    if (!email || initialSendDone) return
    expiryTimer.restart(600) // 10 minutes from page load
    setInitialSendDone(true)
  }, [email, portalType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !loading && !success) {
      handleVerify()
    }
  }, [otp]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async () => {
    if (otp.length !== 6 || loading) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, type: portalType }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setSuccess(true)
        // Brief success animation before redirect
        setTimeout(() => {
          void (async () => {
            if (data?.loginToken && data?.email) {
              await signIn('credentials', {
                email: data.email,
                loginToken: data.loginToken,
                intent: portalType,
                redirect: false,
              })
            }
            router.refresh()
            router.push(redirectOnSuccess)
          })()
        }, 900)
      } else {
        setError(getErrorMessage(data))
        // If already verified, redirect after a delay
        if (data?.code === 'ALREADY_VERIFIED') {
          setTimeout(() => router.push(redirectOnSuccess), 2000)
        }
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resending || resendCooldown.isRunning) return
    setResending(true)
    setError('')
    setResent(false)

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: portalType }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setResent(true)
        setOtp('')
        expiryTimer.restart(600)
        resendCooldown.restart(30)
      } else {
        setError(getErrorMessage(data))
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ── RENDER ──

  if (success) {
    return (
      <div className={`min-h-screen bg-gradient-to-b ${config.gradient} flex items-center justify-center py-12 px-4`}>
        <div className="w-full max-w-lg rounded-[2rem] border border-green-200 bg-white/95 shadow-2xl shadow-green-100/60 p-8 backdrop-blur-sm text-center">
          <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Email Verified!</h2>
          <p className="text-sm text-slate-500">Redirecting you now…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${config.gradient} flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white/95 shadow-2xl shadow-slate-200/60 p-8 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-2xl">
            {config.icon}
          </div>
          <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${config.badgeColor}`}>
            {portalLabel}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Verify your email
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {subtitle || (
              <>Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{email}</span>.</>
            )}
          </p>
        </div>

        {/* Form */}
        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            handleVerify()
          }}
        >
          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Resent success */}
          {resent && !error && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Verification code sent! Check your email.
            </div>
          )}

          {/* OTP Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Verification code
            </label>
            <OtpCodeInput value={otp} onChange={setOtp} disabled={loading} />
          </div>

          {/* Expiry Timer */}
          {expiryTimer.isRunning && (
            <div className="text-center">
              <span className={`text-xs font-medium ${expiryTimer.seconds < 60 ? 'text-red-500' : 'text-slate-400'}`}>
                Code expires in {formatTime(expiryTimer.seconds)}
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying…
              </span>
            ) : (
              'Verify email'
            )}
          </button>

          {/* Help text + Resend */}
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-500">
              Didn&apos;t receive a code? Check your spam folder.
            </p>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown.isRunning}
              className="w-full h-11 bg-transparent border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {resending
                ? 'Sending…'
                : resendCooldown.isRunning
                  ? `Resend in ${resendCooldown.seconds}s`
                  : 'Resend verification code'}
            </button>
          </div>

          {/* Back to login */}
          <div className="pt-2 text-center">
            <Link
              href={`/${portalType === 'user' ? 'user/login' : `${portalType}/auth?tab=login`}`}
              className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
