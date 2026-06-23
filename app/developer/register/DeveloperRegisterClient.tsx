'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

export default function DeveloperRegisterClient() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/developer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          phone: formData.phone,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError((data && data.error) || 'Registration failed. Please try again.')
        return
      }

      // Redirect to login with success message
      router.push(`/developer/login?registered=1&email=${encodeURIComponent(formData.email)}`)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = (
    id: string,
    label: string,
    type: string,
    key: keyof typeof formData,
    placeholder: string,
    required = true
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        value={formData[key]}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <AuthLayout title="Register as Developer" subtitle="Create your company profile on MillionFlats and start publishing projects">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {field('dev-company', 'Company Name *', 'text', 'companyName', 'e.g. Damac Properties')}
        {field('dev-reg-email', 'Business Email *', 'email', 'email', 'Enter your business email')}
        {field('dev-phone', 'Phone Number', 'tel', 'phone', '+91 9876543210', false)}

        {/* Password with toggle */}
        <div>
          <label htmlFor="dev-reg-password" className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
          <div className="relative">
            <input
              id="dev-reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all pr-12"
              placeholder="Min. 8 characters"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-gray-400 hover:text-gray-600 inline-flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        {field('dev-reg-confirm', 'Confirm Password *', 'password', 'confirmPassword', 'Re-enter your password')}

        <p className="text-xs text-gray-500">
          By registering, you agree to our{' '}
          <Link href="/terms" className="text-dark-blue hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-dark-blue hover:underline">Privacy Policy</Link>.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-dark-blue/20"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating account...
            </span>
          ) : 'Create Developer Account'}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/developer/login" className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
