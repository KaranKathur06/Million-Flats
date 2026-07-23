'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

type Portal = 'user' | 'buyer' | 'agent' | 'developer' | 'agency' | 'admin'

const PORTAL_COPY: Record<Portal, { title: string; subtitle: string; loginHref: string; registerHref?: string; verifyBase: string }> = {
  user: {
    title: 'Forgot Password',
    subtitle: "Enter your email and we'll send you a reset link.",
    loginHref: '/user/login',
    registerHref: '/auth/user/register',
    verifyBase: '/user/verify',
  },
  buyer: {
    title: 'Buyer Password Recovery',
    subtitle: "Enter your email and we'll send you a reset link.",
    loginHref: '/user/login',
    registerHref: '/auth/user/register',
    verifyBase: '/user/verify',
  },
  agent: {
    title: 'Agent Password Recovery',
    subtitle: 'Reset access to your agent workspace.',
    loginHref: '/agent/auth?tab=login',
    registerHref: '/agent/register',
    verifyBase: '/agent/verify-email',
  },
  developer: {
    title: 'Developer Password Recovery',
    subtitle: 'Reset access to your developer workspace.',
    loginHref: '/developer/auth?tab=login',
    registerHref: '/developer/register',
    verifyBase: '/developer/verify-otp',
  },
  agency: {
    title: 'Agency Password Recovery',
    subtitle: 'Reset access to your agency workspace.',
    loginHref: '/agency/auth?tab=login',
    registerHref: '/agency/register',
    verifyBase: '/agency/verify-otp',
  },
  admin: {
    title: 'Admin Password Recovery',
    subtitle: 'Reset access to the MillionFlats admin console.',
    loginHref: '/admin/login',
    verifyBase: '/user/verify',
  },
}

export default function ForgotPasswordForm({ portal = 'user' }: { portal?: Portal }) {
  const copy = PORTAL_COPY[portal]
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [verifyUrl, setVerifyUrl] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setErrorCode('')
    setSuccess('')
    setVerifyUrl('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, portal }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErrorCode((data && data.code) || '')
        setVerifyUrl((data && data.verifyUrl) || '')
        setError((data && data.message) || 'Something went wrong. Please try again.')
        return
      }

      setSuccess((data && data.message) || 'Reset link sent to your email.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const encodedEmail = encodeURIComponent(email)
  const fallbackVerifyUrl = `${copy.verifyBase}?email=${encodedEmail}`

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {error && errorCode.endsWith('NOT_REGISTERED') && copy.registerHref ? (
          <Link
            href={`${copy.registerHref}?email=${encodedEmail}`}
            className="block w-full text-center h-12 leading-[3rem] rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200"
          >
            Register
          </Link>
        ) : null}
        {error && errorCode === 'EMAIL_NOT_VERIFIED' ? (
          <Link
            href={verifyUrl || fallbackVerifyUrl}
            className="block w-full text-center h-12 leading-[3rem] rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200"
          >
            Verify Email
          </Link>
        ) : null}
        {success ? <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">{success}</div> : null}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div className="text-center text-sm text-gray-600">
          <Link href={copy.loginHref} className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
