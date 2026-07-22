'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

interface PasswordStrength {
  score: number
  level: 'weak' | 'fair' | 'good' | 'strong'
  errors: string[]
}

interface FormState {
  token: string
  password: string
  confirmPassword: string
  showPassword: boolean
  showConfirmPassword: boolean
  loading: boolean
  error: string
  success: boolean
  passwordStrength: PasswordStrength | null
}

export default function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  const [formState, setFormState] = useState<FormState>({
    token,
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    loading: false,
    error: '',
    success: false,
    passwordStrength: null,
  })

  // Validate password strength when user types
  useEffect(() => {
    if (!formState.password) {
      setFormState((prev) => ({ ...prev, passwordStrength: null }))
      return
    }

    const errors: string[] = []
    let score = 0

    if (formState.password.length < 8) {
      errors.push('Minimum 8 characters')
    } else {
      score += 20
    }

    if (!/[A-Z]/.test(formState.password)) {
      errors.push('At least one uppercase letter')
    } else {
      score += 20
    }

    if (!/[a-z]/.test(formState.password)) {
      errors.push('At least one lowercase letter')
    } else {
      score += 20
    }

    if (!/[0-9]/.test(formState.password)) {
      errors.push('At least one number')
    } else {
      score += 20
    }

    if (!/[!@#$%^&*]/.test(formState.password)) {
      errors.push('At least one special character (!@#$%^&*)')
    } else {
      score += 20
    }

    let level: 'weak' | 'fair' | 'good' | 'strong' = 'weak'
    if (score >= 80) level = 'strong'
    else if (score >= 60) level = 'good'
    else if (score >= 40) level = 'fair'

    setFormState((prev) => ({
      ...prev,
      passwordStrength: { score, level, errors },
    }))
  }, [formState.password])

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setFormState((prev) => ({
        ...prev,
        error: 'Invalid or missing reset token. Please request a new password reset link.',
      }))
    }
  }, [token])

  const getStrengthColor = (level: string): string => {
    switch (level) {
      case 'strong':
        return 'bg-green-500'
      case 'good':
        return 'bg-blue-500'
      case 'fair':
        return 'bg-amber-500'
      default:
        return 'bg-red-500'
    }
  }

  const getStrengthLabel = (level: string): string => {
    switch (level) {
      case 'strong':
        return 'Strong'
      case 'good':
        return 'Good'
      case 'fair':
        return 'Fair'
      default:
        return 'Weak'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formState.password || !formState.confirmPassword) {
      setFormState((prev) => ({
        ...prev,
        error: 'Please enter a new password and confirm it.',
      }))
      return
    }

    if (formState.password !== formState.confirmPassword) {
      setFormState((prev) => ({
        ...prev,
        error: 'Passwords do not match. Please try again.',
      }))
      return
    }

    if (formState.passwordStrength && formState.passwordStrength.errors.length > 0) {
      setFormState((prev) => ({
        ...prev,
        error: 'Password does not meet security requirements.',
      }))
      return
    }

    setFormState((prev) => ({ ...prev, loading: true, error: '' }))

    try {
      const response = await fetch('/api/developer/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: formState.token,
          password: formState.password,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setFormState((prev) => ({
          ...prev,
          success: true,
          error: '',
        }))
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/developer/login')
        }, 2000)
      } else {
        setFormState((prev) => ({
          ...prev,
          error: data.error || 'Failed to reset password. Please try again.',
        }))
      }
    } catch (err) {
      console.error('[reset-password] Error:', err)
      setFormState((prev) => ({
        ...prev,
        error: 'An error occurred. Please try again.',
      }))
    } finally {
      setFormState((prev) => ({ ...prev, loading: false }))
    }
  }

  if (formState.success) {
    return (
      <AuthLayout title="Password Reset Successfully" subtitle="Your password has been changed">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Message */}
          <div>
            <p className="text-gray-600 mb-2">
              Your password has been reset successfully.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to sign in...
            </p>
          </div>

          {/* Button */}
          <Link
            href="/developer/login"
            className="block w-full h-10 leading-10 rounded-xl font-medium bg-blue-600 text-white text-center hover:bg-blue-700 transition-all duration-200"
          >
            Sign In Now
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create New Password" subtitle="Choose a strong, secure password">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Error Message */}
        {formState.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {formState.error}
          </div>
        )}

        {/* New Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={formState.showPassword ? 'text' : 'password'}
              value={formState.password}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="••••••••"
              disabled={formState.loading}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              required
            />
            <button
              type="button"
              onClick={() =>
                setFormState((prev) => ({
                  ...prev,
                  showPassword: !prev.showPassword,
                }))
              }
              disabled={formState.loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {formState.showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {formState.passwordStrength && formState.password && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Password Strength</span>
                <span className={`text-xs font-semibold ${
                  formState.passwordStrength.level === 'strong' ? 'text-green-600' :
                  formState.passwordStrength.level === 'good' ? 'text-blue-600' :
                  formState.passwordStrength.level === 'fair' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {getStrengthLabel(formState.passwordStrength.level)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStrengthColor(formState.passwordStrength.level)} transition-all duration-300`}
                  style={{
                    width: `${formState.passwordStrength.score}%`,
                  }}
                />
              </div>

              {/* Requirements */}
              {formState.passwordStrength.errors.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1">
                  {formState.passwordStrength.errors.map((error) => (
                    <li key={error} className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={formState.showConfirmPassword ? 'text' : 'password'}
              value={formState.confirmPassword}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="••••••••"
              disabled={formState.loading}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              required
            />
            <button
              type="button"
              onClick={() =>
                setFormState((prev) => ({
                  ...prev,
                  showConfirmPassword: !prev.showConfirmPassword,
                }))
              }
              disabled={formState.loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {formState.showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {/* Match Indicator */}
          {formState.confirmPassword && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {formState.password === formState.confirmPassword ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-600 font-medium">Passwords match</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-600 font-medium">Passwords don't match</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            formState.loading ||
            !formState.password ||
            !formState.confirmPassword ||
            formState.password !== formState.confirmPassword ||
            (formState.passwordStrength?.errors.length ?? 0) > 0
          }
          className="w-full h-10 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
        >
          {formState.loading ? 'Resetting Password...' : 'Reset Password'}
        </button>

        {/* Back to Login */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            <Link href="/developer/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Back to Sign In
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
