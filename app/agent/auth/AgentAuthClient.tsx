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

type PasswordStrength = 'weak' | 'medium' | 'strong'

const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return 'weak'
  if (password.length < 8) return 'weak'
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium'
  return 'strong'
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
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak')

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

  useEffect(() => {
    setPasswordStrength(getPasswordStrength(registerData.password))
  }, [registerData.password])

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
      title={tab === 'login' ? 'Welcome Back' : 'Join as Agent'}
      subtitle={
        tab === 'login'
          ? 'Sign in to your agent account and grow your business'
          : 'Start listing properties and grow your real estate business'
      }
    >
      <div className="space-y-6">
        {/* Modern Tab Navigation */}
        <div className="flex gap-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-2xl p-1.5 border border-slate-200 shadow-sm">
          {(['login', 'register'] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTab(item)
                setLoginError('')
                setRegisterError('')
              }}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition duration-200 ${
                tab === item
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              {item === 'login' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Register
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            {loginError ? (
              <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-red-50 px-4 py-4 text-sm text-red-700 flex items-start gap-3 shadow-sm">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{loginError}</span>
              </div>
            ) : null}

            {showLoginResetCta ? (
              <Link
                href={`/user/forgot-password?email=${encodeURIComponent(loginData.email)}`}
                className="block w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105 transform"
              >
                Reset Password
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: safeNext ? `/auth/redirect?next=${encodeURIComponent(safeNext)}` : '/auth/redirect' })}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-md flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-xs font-semibold text-slate-500 bg-white px-3">
                OR
              </div>
            </div>

            <div>
              <label htmlFor="agent-email" className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                Business Email
              </label>
              <input
                id="agent-email"
                type="email"
                required
                value={loginData.email}
                onChange={(event) => setLoginData((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gradient-to-br from-slate-50 to-white"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="agent-password" className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                </svg>
                Password
              </label>
              <div className="relative">
                <input
                  id="agent-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginData.password}
                  onChange={(event) => setLoginData((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gradient-to-br from-slate-50 to-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                      <path d="M15.171 13.576l1.472 1.473a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.412 0 4.7-.597 6.689-1.654z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="text-right pt-2">
              <Link href="/agent/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-105 duration-200"
            >
              {loginLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have an agent account?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('register')
                  setLoginError('')
                  setRegisterError('')
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Register now
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleRegisterSubmit}>
            {registerError ? (
              <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-red-50 px-4 py-4 text-sm text-red-700 flex items-start gap-3 shadow-sm">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{registerError}</span>
              </div>
            ) : null}

            {/* Personal Information Section */}
            <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2.5">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Personal Information</p>
                  <p className="text-xs text-slate-500">Your basic details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={registerData.name}
                    onChange={(event) => setRegisterData((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Business Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={registerData.email}
                    onChange={(event) => setRegisterData((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Phone Number</label>
                  <div>
                    <PhoneInput
                      international
                      defaultCountry="AE"
                      value={registerData.phone}
                      onChange={(value) => setRegisterData((prev) => ({ ...prev, phone: value || '' }))}
                      inputComponent="input"
                      countrySelectProps={{ className: 'rounded-l-xl border-2 border-r-0 border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none' }}
                      numberInputProps={{
                        required: true,
                        placeholder: '+971 XX XXX XXXX',
                        className: 'w-full rounded-r-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-2.5">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Security</p>
                  <p className="text-xs text-slate-500">Create a strong password</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Password</label>
                  <div className="relative">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      value={registerData.password}
                      onChange={(event) => setRegisterData((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition"
                      aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegisterPassword ? (
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                          <path d="M15.171 13.576l1.472 1.473a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.412 0 4.7-.597 6.689-1.654z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {registerData.password && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              passwordStrength === 'strong' ? 'w-full bg-gradient-to-r from-green-400 to-green-500' :
                              passwordStrength === 'medium' ? 'w-2/3 bg-gradient-to-r from-yellow-400 to-yellow-500' :
                              'w-1/3 bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 capitalize">{passwordStrength}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {passwordStrength === 'weak' && 'Use at least 8 characters with uppercase and numbers'}
                        {passwordStrength === 'medium' && 'Good! Add more complexity for stronger security'}
                        {passwordStrength === 'strong' && 'Excellent! Your password is strong'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={registerData.confirmPassword}
                      onChange={(event) => setRegisterData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      className={`w-full rounded-xl border-2 px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 bg-white ${
                        registerData.confirmPassword && registerData.password !== registerData.confirmPassword
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                          <path d="M15.171 13.576l1.472 1.473a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.412 0 4.7-.597 6.689-1.654z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18.101 12.93a1 1 0 00-1.414-1.414L9 19.586 4.314 14.9a1 1 0 00-1.414 1.414l5.5 5.5a1 1 0 001.414 0l8.687-8.687z" clipRule="evenodd"/>
                      </svg>
                      Passwords don&apos;t match
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms Section */}
            <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <input
                  type="checkbox"
                  required
                  checked={registerData.acceptedTerms}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, acceptedTerms: event.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    I agree to the{' '}
                    <Link href="/terms" className="font-semibold text-blue-600 hover:text-blue-700 transition">
                      Terms and Conditions
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="font-semibold text-blue-600 hover:text-blue-700 transition">
                      Privacy Policy
                    </Link>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">We take your privacy and security seriously</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={registerLoading || !registerData.acceptedTerms}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-105 duration-200 flex items-center justify-center gap-2"
            >
              {registerLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Create Agent Account
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('login')
                  setLoginError('')
                  setRegisterError('')
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 transition"
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
