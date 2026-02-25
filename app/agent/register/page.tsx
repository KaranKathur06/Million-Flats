'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PhoneInput from 'react-phone-number-input'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import AgentAuthLayout from '@/components/AgentAuthLayout'

export default function AgentRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    license: '',
    licenseAuthority: '',
    yearsExperience: '',
    primaryMarket: '',
    specialization: [] as string[],
    company: '',
    linkedinUrl: '',
    websiteUrl: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPolicy, setAcceptedPolicy] = useState(false)

  const toggleSpecialization = (value: string) => {
    setFormData((prev) => {
      const list = Array.isArray(prev.specialization) ? prev.specialization : []
      const exists = list.includes(value)
      return { ...prev, specialization: exists ? list.filter((v) => v !== value) : [...list, value] }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!acceptedTerms || !acceptedPolicy) {
      setError('Please accept the terms and the agent verification policy')
      setLoading(false)
      return
    }

    try {
      const phone = String(formData.phone || '').trim()
      const parsedPhone = phone ? parsePhoneNumberFromString(phone) : null
      const phoneCountryIso2 = String(parsedPhone?.country || '').toUpperCase()
      const phoneNationalNumber = String(parsedPhone?.nationalNumber || '')

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone,
          phoneCountryIso2: phoneCountryIso2 || undefined,
          phoneNationalNumber: phoneNationalNumber || undefined,
          license: formData.license,
          licenseAuthority: formData.licenseAuthority,
          yearsExperience: formData.yearsExperience,
          primaryMarket: formData.primaryMarket,
          specialization: formData.specialization,
          company: formData.company,
          linkedinUrl: formData.linkedinUrl,
          websiteUrl: formData.websiteUrl,
          acceptedTerms,
          acceptedPolicy,
          type: 'agent',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push(`/agent/verify?email=${encodeURIComponent(formData.email)}`)
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AgentAuthLayout
      title="Register as Agent"
      subtitle="List properties, manage inquiries, and grow your real estate business"
      allowScroll
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-dark-blue">Account Details</p>
            <div className="h-px bg-gray-200 mt-4" />
          </div>

          <div className="px-5 pb-5">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3.5 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:border-dark-blue/30 transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3.5 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:border-dark-blue/30 transition-all"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <PhoneInput
                  international
                  defaultCountry="AE"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                  className="mf-phone"
                  numberInputProps={{
                    id: 'phone',
                    name: 'phone',
                    required: true,
                    placeholder: 'Enter phone number',
                  }}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-10 px-3.5 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:border-dark-blue/30 transition-all pr-12"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-gray-400 hover:text-gray-600 inline-flex items-center justify-center"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full h-10 px-3.5 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:border-dark-blue/30 transition-all pr-12"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-gray-400 hover:text-gray-600 inline-flex items-center justify-center"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="flex items-start">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-dark-blue focus:ring-dark-blue border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-dark-blue hover:underline">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-dark-blue hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <div className="flex items-start">
                <input
                  id="policy"
                  name="policy"
                  type="checkbox"
                  checked={acceptedPolicy}
                  onChange={(e) => setAcceptedPolicy(e.target.checked)}
                  className="mt-1 h-4 w-4 text-dark-blue focus:ring-dark-blue border-gray-300 rounded"
                />
                <label htmlFor="policy" className="ml-3 text-sm text-gray-600">
                  I accept the{' '}
                  <Link href="/agent-verification" className="text-dark-blue hover:underline">
                    Agent Verification Policy
                  </Link>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-gradient-to-r from-blue-700 to-blue-600 text-white px-4 rounded-xl font-semibold hover:from-blue-800 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-dark-blue/20"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Registering...
            </span>
          ) : (
            'Register as Agent'
          )}
        </button>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600">
          Already have an agent account?{' '}
          <Link href="/auth/agent/login" className="font-medium text-dark-blue hover:text-dark-blue/80 transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </AgentAuthLayout>
  )
}
