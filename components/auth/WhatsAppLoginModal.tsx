'use client'

/**
 * WhatsAppLoginModal.tsx
 *
 * Premium WhatsApp OTP login popup matching MillionFlats reference screenshots.
 * Two-phase modal:
 *   Phase A — Phone entry (country selector + phone number + Continue)
 *   Phase B — OTP verification (masked phone + 6-cell OTP + countdown + Verify)
 *
 * Features:
 *   - Dark background blur overlay
 *   - Smooth slide-up + fade animation
 *   - Country selector with flag + dial code
 *   - Auto-focus, auto-advance, auto-submit OTP cells
 *   - Paste support
 *   - Keyboard navigation + accessibility (ARIA)
 *   - Countdown timer with resend
 *   - Progress indicator (step 1/2)
 *   - Change number link
 *   - Mobile responsive
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import OtpCodeInput from '@/components/OtpCodeInput'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WhatsAppLoginModalProps {
  open: boolean
  onClose: () => void
  onLoginSuccess?: () => void
  redirectTo?: string
}

interface CountryOption {
  code: string
  name: string
  dial: string
  flag: string
}

// ─── Country Data ────────────────────────────────────────────────────────────

const COUNTRIES: CountryOption[] = [
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
]

type Phase = 'phone' | 'otp'

// ─── Component ───────────────────────────────────────────────────────────────

export default function WhatsAppLoginModal({ open, onClose, onLoginSuccess, redirectTo }: WhatsAppLoginModalProps) {
  const [phase, setPhase] = useState<Phase>('phone')
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [fullPhone, setFullPhone] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [resendAfter, setResendAfter] = useState(60)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

  const phoneInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Reset on close ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      // Delay reset so close animation plays first
      const t = setTimeout(() => {
        setPhase('phone')
        setPhoneNumber('')
        setOtpValue('')
        setMaskedPhone('')
        setFullPhone('')
        setError('')
        setCountdown(0)
        setIsLoading(false)
        setShowCountryDropdown(false)
      }, 300)
      return () => clearTimeout(t)
    } else {
      // Focus phone input when opening
      setTimeout(() => phoneInputRef.current?.focus(), 100)
    }
  }, [open])

  // ─── Countdown timer ───────────────────────────────────────────────────────

  useEffect(() => {
    if (countdown <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [countdown])

  // ─── Escape key ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // ─── Send OTP ──────────────────────────────────────────────────────────────

  const handleSendOtp = useCallback(async () => {
    const cleaned = phoneNumber.replace(/\D/g, '')
    if (!cleaned || cleaned.length < 6) {
      setError('Please enter a valid phone number.')
      return
    }

    const phone = `${selectedCountry.dial}${cleaned}`
    setFullPhone(phone)
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to send verification code.')
        if (data.resendAfter) setCountdown(data.resendAfter)
        return
      }

      setMaskedPhone(data.maskedPhone || phone)
      setResendAfter(data.resendAfter || 60)
      setCountdown(data.resendAfter || 60)
      setPhase('otp')
      setOtpValue('')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }, [phoneNumber, selectedCountry])

  // ─── Verify OTP ────────────────────────────────────────────────────────────

  const handleVerifyOtp = useCallback(async (otpCode?: string) => {
    const code = otpCode || otpValue
    if (code.length !== 6) return

    setError('')
    setIsLoading(true)

    try {
      // Step 1: Verify OTP and get verification token
      const verifyRes = await fetch('/api/auth/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, otp: code }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok || !verifyData.success) {
        setError(verifyData.error || 'Verification failed.')
        setOtpValue('')
        return
      }

      // Step 2: Sign in via NextAuth using the verification token
      const signInResult = await signIn('whatsapp-otp', {
        verificationToken: verifyData.verificationToken,
        redirect: false,
      })

      if (signInResult?.error) {
        if (signInResult.error === 'ACCOUNT_BANNED') {
          setError('This account has been suspended.')
        } else if (signInResult.error === 'ACCOUNT_DISABLED') {
          setError('This account has been temporarily disabled.')
        } else {
          setError('Sign in failed. Please try again.')
        }
        return
      }

      // Success! Close modal and redirect
      onClose()
      if (onLoginSuccess) {
        onLoginSuccess()
      } else if (redirectTo) {
        window.location.href = redirectTo
      } else {
        // Reload to let NextAuth session propagate
        window.location.reload()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [otpValue, fullPhone, onClose, onLoginSuccess])

  // ─── Auto-submit OTP on 6th digit ─────────────────────────────────────────

  const handleOtpChange = useCallback((value: string) => {
    setOtpValue(value)
    setError('')
    if (value.length === 6) {
      // Small delay so user sees the last digit fill in
      setTimeout(() => handleVerifyOtp(value), 200)
    }
  }, [handleVerifyOtp])

  // ─── Resend OTP ────────────────────────────────────────────────────────────

  const handleResend = useCallback(async () => {
    if (countdown > 0) return
    setError('')
    setOtpValue('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to resend code.')
        if (data.resendAfter) setCountdown(data.resendAfter)
        return
      }

      setCountdown(data.resendAfter || 60)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [countdown, fullPhone])

  // ─── Change number ─────────────────────────────────────────────────────────

  const handleChangeNumber = useCallback(() => {
    setPhase('phone')
    setOtpValue('')
    setError('')
    setTimeout(() => phoneInputRef.current?.focus(), 100)
  }, [])

  // ─── Format countdown ─────────────────────────────────────────────────────

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Login with WhatsApp"
      >
        <div
          ref={modalRef}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Progress indicator */}
          <div className="flex items-center gap-1.5 px-6 pt-6">
            <div className={`h-1 rounded-full transition-all duration-500 ${phase === 'phone' ? 'w-8 bg-[#25D366]' : 'w-4 bg-[#25D366]'}`} />
            <div className={`h-1 rounded-full transition-all duration-500 ${phase === 'otp' ? 'w-8 bg-[#25D366]' : 'w-4 bg-gray-200'}`} />
          </div>

          <div className="p-6 pt-4">
            {/* ─── Phase A: Phone Entry ──────────────────────────────────── */}
            {phase === 'phone' && (
              <div className="space-y-5">
                {/* WhatsApp Icon + Title */}
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Login with WhatsApp</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Enter your phone number to receive a verification code via WhatsApp
                  </p>
                </div>

                {/* Country Selector */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-white text-left hover:border-gray-300 transition-colors"
                  >
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="text-sm font-medium text-gray-900 flex-1">{selectedCountry.name}</span>
                    <span className="text-sm text-gray-500">{selectedCountry.dial}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showCountryDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {COUNTRIES.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${c.code === selectedCountry.code ? 'bg-gray-50' : ''}`}
                          onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false) }}
                        >
                          <span className="text-lg">{c.flag}</span>
                          <span className="text-sm text-gray-900 flex-1">{c.name}</span>
                          <span className="text-xs text-gray-500">{c.dial}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone Number Input */}
                <div>
                  <label htmlFor="wa-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 whitespace-nowrap">
                      {selectedCountry.flag} {selectedCountry.dial}
                    </span>
                    <input
                      id="wa-phone"
                      ref={phoneInputRef}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChange={e => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendOtp() }}
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl" role="alert">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Continue Button */}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading || !phoneNumber || phoneNumber.length < 6}
                  className="w-full py-3.5 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20BD5A] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-[#25D366]/20"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-400">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            )}

            {/* ─── Phase B: OTP Verification ─────────────────────────────── */}
            {phase === 'otp' && (
              <div className="space-y-5">
                {/* Shield Icon + Title */}
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-[#25D366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Verification Code</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Code sent to <span className="font-medium text-gray-700">{maskedPhone}</span> via WhatsApp
                  </p>
                </div>

                {/* OTP Input */}
                <OtpCodeInput
                  value={otpValue}
                  onChange={handleOtpChange}
                  disabled={isLoading}
                  autoFocus
                />

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl" role="alert">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Countdown + Resend */}
                <div className="flex items-center justify-between text-sm">
                  {countdown > 0 ? (
                    <span className="text-gray-500">
                      Resend in <span className="font-bold text-gray-700">{formatCountdown(countdown)}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">Didn&apos;t receive the code?</span>
                  )}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0 || isLoading}
                    className={`font-medium transition-colors ${countdown > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-[#25D366] hover:text-[#20BD5A]'}`}
                  >
                    Resend Code
                  </button>
                </div>

                {/* Verify Button */}
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={isLoading || otpValue.length !== 6}
                  className="w-full py-3.5 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20BD5A] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-[#25D366]/20"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify Code'
                  )}
                </button>

                {/* Change Number */}
                <button
                  type="button"
                  onClick={handleChangeNumber}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Change number
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-up animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  )
}
