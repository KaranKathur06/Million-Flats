'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import AgentAuthLayout from '@/components/AgentAuthLayout'
import PhoneInput from 'react-phone-number-input'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

type Tab = 'login' | 'register'

type LoginData = {
  email: string
  password: string
}

type RegisterData = {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  acceptedTerms: boolean
}

export default function AgentAuthClient({ defaultTab }: { defaultTab: Tab }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [loginData, setLoginData] = useState<LoginData>({ email: '', password: '' })
  const [registerData, setRegisterData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptedTerms: false,
  })
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [showLoginResetCta, setShowLoginResetCta] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const nextTab = searchParams?.get('tab')
    if (nextTab === 'login' || nextTab === 'register') {
      setTab(nextTab)
    }
  }, [searchParams])

  useEffect(() => {
    router.replace(`/agent/auth?tab=${tab}`, { scroll: false })
  }, [router, tab])

  useEffect(() => {
    const authError = searchParams?.get('error')
    if (!authError) return

    if (authError === 'not_registered' || authError === 'agent_not_registered') {
      setLoginError('This account is not registered as an agent. Apply as an agent to continue.')
    } else if (authError === 'email_not_registered') {
      setLoginError('Email not registered. Please register first.')
    } else if (authError === 'account_disabled') {
      setLoginError('Your account is disabled. Please contact support.')
    }
  }, [searchParams])

  const next = searchParams?.get('next')
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : ''

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    setShowLoginResetCta(false)

    try {
      const callbackUrl = safeNext ? `/auth/redirect?next=${encodeURIComponent(safeNext)}` : '/auth/redirect'
      const result = await signIn('credentials', {
        email: loginData.email,
        password: loginData.password,
        intent: 'agent',
        redirect: false,
        callbackUrl,
      })

      if (result?.ok && result.url) {
        router.push(result.url)
        return
      }

      const raw = (result as any)?.error || 'Login failed'
      if (raw === 'EMAIL_NOT_VERIFIED') setLoginError('Please verify your email before signing in.')
      else if (raw === 'INVALID_PASSWORD') setLoginError('Invalid email or password.')
      else if (raw === 'PASSWORD_NOT_SET') { setLoginError('Password is not set. Please reset your password.'); setShowLoginResetCta(true) }
      else if (raw === 'ACCOUNT_BANNED') setLoginError('Your account has been banned. Please contact support.')
      else if (raw === 'ACCOUNT_DISABLED') setLoginError('Your account is suspended. Please contact support.')
      else if (raw === 'AGENT_NOT_REGISTERED') setLoginError('This account is not registered as an agent. Apply as an agent to continue.')
      else if (raw === 'CredentialsSignin') setLoginError('Invalid email or password.')
      else setLoginError(raw)
    } catch {
      setLoginError('An error occurred. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRegisterLoading(true)
    setRegisterError('')

    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Passwords do not match')
      setRegisterLoading(false)
      return
    }

    if (!registerData.acceptedTerms) {
      setRegisterError('Please accept the terms and conditions')
      setRegisterLoading(false)
      return
    }

    try {
      const phone = String(registerData.phone || '').trim()
      const parsedPhone = phone ? parsePhoneNumberFromString(phone) : null
      const phoneCountryIso2 = String(parsedPhone?.country || '').toUpperCase()
      const phoneNationalNumber = String(parsedPhone?.nationalNumber || '')

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          phone,
          phoneCountryIso2: phoneCountryIso2 || undefined,
          phoneNationalNumber: phoneNationalNumber || undefined,
          acceptedTerms: registerData.acceptedTerms,
          type: 'agent',
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setRegisterError(data?.message || 'Registration failed')
        return
      }

      router.push(data?.redirectTo && typeof data.redirectTo === 'string' ? data.redirectTo : '/agent/auth?tab=login')
    } catch {
      setRegisterError('An error occurred. Please try again.')
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <AgentAuthLayout
      title={tab === 'login' ? 'Agent Portal' : 'Register as Agent'}
      subtitle={
        tab === 'login'
          ? 'Sign in to manage your listings and grow your real estate business'
          : 'List properties, manage inquiries, and grow your real estate business'
      }
    >
      <div className="space-y-6">
        <div className="flex bg-slate-100 rounded-2xl p-1 border border-slate-200">
          {(['login', 'register'] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTab(item)
                setLoginError('')
                setRegisterError('')
              }}
              className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition ${
                tab === item
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {item === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            {loginError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loginError}</div>
            ) : null}

            {showLoginResetCta ? (
              <Link
                href={`/user/forgot-password?email=${encodeURIComponent(loginData.email)}`}
                className="block w-full rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Reset Password
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: safeNext ? `/auth/redirect?next=${encodeURIComponent(safeNext)}` : '/auth/redirect' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs text-slate-500">
                <span className="bg-white px-3">OR</span>
              </div>
            </div>

            <div>
              <label htmlFor="agent-email" className="block text-sm font-medium text-slate-700 mb-2">
                Business Email
              </label>
              <input
                id="agent-email"
                type="email"
                required
                value={loginData.email}
                onChange={(event) => setLoginData((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Enter your business email"
              />
            </div>

            <div>
              <label htmlFor="agent-password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="agent-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginData.password}
                  onChange={(event) => setLoginData((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showLoginPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link href="/agent/forgot-password" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an agent account?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('register')
                  setLoginError('')
                  setRegisterError('')
                }}
                className="font-semibold text-slate-900 hover:text-slate-700"
              >
                Register as Agent
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleRegisterSubmit}>
            {registerError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{registerError}</div>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Account Details</p>
              <div className="mt-4 space-y-4">
                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Full Name</span>
                  <input
                    type="text"
                    required
                    value={registerData.name}
                    onChange={(event) => setRegisterData((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter your full name"
                  />
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Business Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={registerData.email}
                    onChange={(event) => setRegisterData((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="name@company.com"
                  />
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Phone Number</span>
                  <PhoneInput
                    international
                    defaultCountry="AE"
                    value={registerData.phone}
                    onChange={(value) => setRegisterData((prev) => ({ ...prev, phone: value || '' }))}
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-slate-200"
                    inputComponent="input"
                    countrySelectProps={{ className: 'text-sm' }}
                    numberInputProps={{
                      required: true,
                      placeholder: 'Enter phone number',
                      className: 'w-full bg-transparent text-sm text-slate-900 focus:outline-none',
                    }}
                  />
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Password</span>
                  <div className="relative">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      value={registerData.password}
                      onChange={(event) => setRegisterData((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showRegisterPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Confirm Password</span>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={registerData.confirmPassword}
                      onChange={(event) => setRegisterData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showConfirmPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Terms & Conditions</p>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  required
                  checked={registerData.acceptedTerms}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, acceptedTerms: event.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-600"
                />
                <span>
                  I agree to the{' '}
                  <Link href="/terms" className="font-semibold text-slate-900 hover:underline">
                    Terms and Conditions
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="font-semibold text-slate-900 hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={registerLoading}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {registerLoading ? 'Creating account…' : 'Create Agent Account'}
            </button>

            <p className="text-center text-sm text-slate-500">
              Already have an agent account?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('login')
                  setLoginError('')
                  setRegisterError('')
                }}
                className="font-semibold text-slate-900 hover:text-slate-700"
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </AgentAuthLayout>
  )
}
