'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signIn } from 'next-auth/react'

type Tab = 'login' | 'register'

const COUNTRY_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+971', label: 'AE +971' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+65', label: 'SG +65' },
  { code: '+60', label: 'MY +60' },
]

const CITIES = ['Dubai', 'Abu Dhabi', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Singapore', 'London', 'New York']

/* ── Shared OTP step ── */
function OtpStep({ phone, onSuccess, onBack }: { phone: string; onSuccess: () => void; onBack: () => void }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(30)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const t = setInterval(() => setResendTimer(p => Math.max(0, p - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const focusNext = (i: number) => inputRefs.current[i + 1]?.focus()
  const focusPrev = (i: number) => inputRefs.current[i - 1]?.focus()

  const handleKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'Backspace' && !otp[i]) focusPrev(i)
    if (e.key === 'ArrowLeft') focusPrev(i)
    if (e.key === 'ArrowRight') focusNext(i)
  }

  const handleChange = (val: string, i: number) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit) focusNext(i)
  }

  const code = otp.join('')

  const verify = async () => {
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      const res = await signIn('credentials', {
        phone,
        otp: code,
        intent: 'developer',
        redirect: false,
      })
      if (res?.error) { setError('Invalid OTP. Please try again.'); return }
      onSuccess()
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-dark-blue/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">OTP sent to <span className="font-semibold text-gray-800">{phone}</span></p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="flex gap-2 justify-center">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el }}
            type="text" inputMode="numeric" maxLength={1}
            value={digit}
            onChange={e => handleChange(e.target.value, i)}
            onKeyDown={e => handleKey(e, i)}
            className="w-11 h-12 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/20 transition-all outline-none"
          />
        ))}
      </div>

      <button
        onClick={verify}
        disabled={code.length < 6 || loading}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20"
      >
        {loading ? 'Verifying...' : 'Verify & Continue'}
      </button>

      <div className="text-center space-y-2">
        {resendTimer > 0 ? (
          <p className="text-sm text-gray-400">Resend OTP in {resendTimer}s</p>
        ) : (
          <button onClick={() => setResendTimer(30)} className="text-sm font-medium text-dark-blue hover:underline">
            Resend OTP
          </button>
        )}
        <button onClick={onBack} className="block w-full text-sm text-gray-500 hover:text-gray-700">
          ← Change number
        </button>
      </div>
    </div>
  )
}

/* ── Login tab ── */
function LoginTab() {
  const router = useRouter()
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fullPhone = `${countryCode}${phone}`

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, intent: 'developer' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error || 'Failed to send OTP'); return }
      setOtpSent(true)
    } catch {
      setError('Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (otpSent) {
    return (
      <OtpStep
        phone={fullPhone}
        onSuccess={() => router.push('/developer/dashboard')}
        onBack={() => setOtpSent(false)}
      />
    )
  }

  return (
    <form onSubmit={sendOtp} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={e => setCountryCode(e.target.value)}
            className="h-12 px-3 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <input
            type="tel" required
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter phone number"
            className="flex-1 h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
          />
        </div>
      </div>

      <button
        type="submit" disabled={!phone || loading}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20"
      >
        {loading ? 'Sending OTP...' : 'Send OTP'}
      </button>
    </form>
  )
}

/* ── Register tab ── */
function RegisterTab() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    companyName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    country: 'India',
    operatingCities: [] as string[],
  })

  const fullPhone = `${form.countryCode}${form.phone}`

  const toggleCity = (city: string) => {
    setForm(f => ({
      ...f,
      operatingCities: f.operatingCities.includes(city)
        ? f.operatingCities.filter(c => c !== city)
        : [...f.operatingCities, city],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Register
      const res = await fetch('/api/developer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: fullPhone }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error || 'Registration failed'); return }

      // Send OTP
      await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, intent: 'developer' }),
      })
      setStep('otp')
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <OtpStep
        phone={fullPhone}
        onSuccess={() => router.push('/developer/onboarding')}
        onBack={() => setStep('form')}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
        <input
          required value={form.companyName}
          onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
          placeholder="e.g. Emaar Properties, DLF Ltd."
          className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
        <input
          type="email" required value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="contact@yourcompany.com"
          className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
        <div className="flex gap-2">
          <select
            value={form.countryCode}
            onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))}
            className="h-12 px-3 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-dark-blue"
          >
            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input
            type="tel" required value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
            placeholder="Phone number"
            className="flex-1 h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
        <select
          value={form.country}
          onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
          className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-dark-blue"
        >
          {['India', 'UAE', 'Singapore', 'United Kingdom', 'United States'].map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Operating Cities</label>
        <div className="flex flex-wrap gap-2">
          {CITIES.map(city => (
            <button
              key={city} type="button"
              onClick={() => toggleCity(city)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                form.operatingCities.includes(city)
                  ? 'bg-dark-blue text-white border-dark-blue'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-dark-blue/40'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit" disabled={loading || !form.companyName || !form.email || !form.phone}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20"
      >
        {loading ? 'Creating account...' : 'Continue →'}
      </button>

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="text-dark-blue hover:underline">Terms</Link> and{' '}
        <Link href="/privacy" className="text-dark-blue hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  )
}

/* ── Main page ── */
export default function DeveloperAuthClient({ defaultTab }: { defaultTab: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1f38] via-[#142a4a] to-[#0d1f38] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="relative w-10 h-10"><Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain rounded-lg" sizes="40px" /></span>
            <span className="text-white font-bold text-xl">MillionFlats</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6 mb-1">Developer Access</h1>
          <p className="text-white/60 text-sm">
            {tab === 'login' ? 'Sign in to your Developer Portal' : 'Join MillionFlats as a Developer'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-4 text-sm font-semibold transition-all ${
                  tab === t
                    ? 'text-dark-blue border-b-2 border-dark-blue bg-blue-50/50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-8">
            {tab === 'login' ? <LoginTab /> : <RegisterTab />}
          </div>
        </div>

        {/* Back to site */}
        <p className="text-center mt-6 text-white/50 text-sm">
          <Link href="/" className="hover:text-white/80 transition-colors">← Back to MillionFlats</Link>
        </p>
      </div>
    </div>
  )
}
