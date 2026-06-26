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

const AGENCY_SIZES = [
  { value: 'MICRO', label: '1–10 agents' },
  { value: 'SMALL', label: '11–50 agents' },
  { value: 'MEDIUM', label: '51–200 agents' },
  { value: 'LARGE', label: '200+ agents' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
]

const SPECIALIZATIONS = ['Luxury', 'Residential', 'Commercial', 'Off-Plan', 'Rental', 'Investment', 'Villa', 'Apartment']

/* ── Shared OTP box ── */
function OtpStep({ phone, onSuccess, onBack }: { phone: string; onSuccess: () => void; onBack: () => void }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timer, setTimer] = useState(30)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const t = setInterval(() => setTimer(p => Math.max(0, p - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const code = otp.join('')

  const handleChange = (val: string, i: number) => {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[i] = d; setOtp(next)
    if (d) refs.current[i + 1]?.focus()
  }

  const handleKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'Backspace' && !otp[i]) refs.current[i - 1]?.focus()
  }

  const verify = async () => {
    if (code.length < 6) return
    setLoading(true); setError('')
    const res = await signIn('credentials', { phone, otp: code, intent: 'agency', redirect: false })
    if (res?.error) { setError('Invalid OTP. Please try again.'); setLoading(false); return }
    onSuccess()
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
        {otp.map((d, i) => (
          <input key={i} ref={el => { refs.current[i] = el }} type="text" inputMode="numeric" maxLength={1}
            value={d} onChange={e => handleChange(e.target.value, i)} onKeyDown={e => handleKey(e, i)}
            className="w-11 h-12 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/20 transition-all outline-none"
          />
        ))}
      </div>
      <button onClick={verify} disabled={code.length < 6 || loading}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20">
        {loading ? 'Verifying...' : 'Verify & Continue'}
      </button>
      <div className="text-center">
        {timer > 0 ? <p className="text-sm text-gray-400">Resend in {timer}s</p>
          : <button onClick={() => setTimer(30)} className="text-sm font-medium text-dark-blue hover:underline">Resend OTP</button>}
        <button onClick={onBack} className="block w-full mt-2 text-sm text-gray-500 hover:text-gray-700">← Change number</button>
      </div>
    </div>
  )
}

/* ── Login tab ── */
function LoginTab() {
  const router = useRouter()
  const [cc, setCc] = useState('+91')
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fullPhone = `${cc}${phone}`

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) return
    setLoading(true); setError('')
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone, intent: 'agency' }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) { setError(data?.error || 'Failed to send OTP'); setLoading(false); return }
    setOtpSent(true); setLoading(false)
  }

  if (otpSent) return <OtpStep phone={fullPhone} onSuccess={() => router.push('/agency/dashboard')} onBack={() => setOtpSent(false)} />

  return (
    <form onSubmit={sendOtp} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
        <div className="flex gap-2">
          <select value={cc} onChange={e => setCc(e.target.value)} className="h-12 px-3 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-dark-blue">
            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input type="tel" required value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="Phone number" className="flex-1 h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all" />
        </div>
      </div>
      <button type="submit" disabled={!phone || loading}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20">
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
    agencyName: '', email: '', cc: '+91', phone: '',
    country: 'India', state: '', city: '',
    agencySize: 'SMALL', website: '', specializations: [] as string[],
  })
  const fullPhone = `${form.cc}${form.phone}`

  const toggle = (s: string) => setForm(f => ({
    ...f, specializations: f.specializations.includes(s)
      ? f.specializations.filter(x => x !== s)
      : [...f.specializations, s],
  }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch('/api/agency/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, phone: fullPhone }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) { setError(data?.error || 'Registration failed'); setLoading(false); return }
    await fetch('/api/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: fullPhone, intent: 'agency' }) })
    setStep('otp'); setLoading(false)
  }

  if (step === 'otp') return <OtpStep phone={fullPhone} onSuccess={() => router.push('/agency/onboarding')} onBack={() => setStep('form')} />

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div><label className="block text-sm font-medium text-gray-700 mb-2">Agency Name</label>
        <input required value={form.agencyName} onChange={e => setForm(f => ({ ...f, agencyName: e.target.value }))}
          placeholder="e.g. Betterhomes, fäm Properties" className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all" /></div>

      <div><label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
        <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="contact@youragency.com" className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all" /></div>

      <div><label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
        <div className="flex gap-2">
          <select value={form.cc} onChange={e => setForm(f => ({ ...f, cc: e.target.value }))} className="h-12 px-3 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-dark-blue">
            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input type="tel" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
            placeholder="Phone number" className="flex-1 h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-dark-blue">
            {['India', 'UAE', 'Singapore', 'United Kingdom', 'United States'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="e.g. Dubai" className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all" />
        </div>
      </div>

      <div><label className="block text-sm font-medium text-gray-700 mb-2">Agency Size</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AGENCY_SIZES.map(s => (
            <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, agencySize: s.value }))}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${form.agencySize === s.value ? 'bg-dark-blue text-white border-dark-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-dark-blue/40'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div><label className="block text-sm font-medium text-gray-700 mb-2">Specializations</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map(s => (
            <button key={s} type="button" onClick={() => toggle(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.specializations.includes(s) ? 'bg-dark-blue text-white border-dark-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-dark-blue/40'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div><label className="block text-sm font-medium text-gray-700 mb-2">Website <span className="text-gray-400 font-normal">(optional)</span></label>
        <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
          placeholder="https://youragency.com" className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all" />
      </div>

      <button type="submit" disabled={loading || !form.agencyName || !form.email || !form.phone}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20">
        {loading ? 'Creating account...' : 'Continue →'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        By continuing, you agree to our <Link href="/terms" className="text-dark-blue hover:underline">Terms</Link> and <Link href="/privacy" className="text-dark-blue hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  )
}

/* ── Main ── */
export default function AgencyAuthClient({ defaultTab }: { defaultTab: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1f38] via-[#142a4a] to-[#0d1f38] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="relative w-10 h-10"><Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain rounded-lg" sizes="40px" /></span>
            <span className="text-white font-bold text-xl">MillionFlats</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6 mb-1">Agency Access</h1>
          <p className="text-white/60 text-sm">
            {tab === 'login' ? 'Sign in to your Agency Portal' : 'Join MillionFlats as an Agency'}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['login', 'register'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-4 text-sm font-semibold transition-all ${tab === t ? 'text-dark-blue border-b-2 border-dark-blue bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}>
                {t === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>
          <div className="p-8">{tab === 'login' ? <LoginTab /> : <RegisterTab />}</div>
        </div>
        <p className="text-center mt-6 text-white/50 text-sm">
          <Link href="/" className="hover:text-white/80 transition-colors">← Back to MillionFlats</Link>
        </p>
      </div>
    </div>
  )
}
