'use client'

import { useMemo, useState } from 'react'
import { validatePasswordStrength } from '@/lib/auth/shared'

type PasswordInputProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  name?: string
  required?: boolean
  disabled?: boolean
  showStrength?: boolean
  confirmValue?: string
  className?: string
}

const requirements = [
  { label: '8 characters', test: (value: string) => value.length >= 8 },
  { label: 'Uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Number', test: (value: string) => /[0-9]/.test(value) },
  { label: 'Special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
]

function getStrengthTone(strength: 'weak' | 'fair' | 'strong') {
  if (strength === 'strong') return 'text-emerald-700'
  if (strength === 'fair') return 'text-amber-700'
  return 'text-rose-700'
}

function getStrengthBar(strength: 'weak' | 'fair' | 'strong') {
  if (strength === 'strong') return 'from-emerald-500 to-green-500'
  if (strength === 'fair') return 'from-amber-500 to-yellow-500'
  return 'from-rose-500 to-red-500'
}

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'new-password',
  name,
  required = true,
  disabled = false,
  showStrength = true,
  confirmValue,
  className,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  const validation = useMemo(() => validatePasswordStrength(value), [value])
  const requirementState = useMemo(
    () => requirements.map((item) => ({ ...item, passed: item.test(value) })),
    [value]
  )
  const hasConfirmValue = typeof confirmValue === 'string' && confirmValue.length > 0
  const matchState = hasConfirmValue ? (value === confirmValue ? 'match' : 'mismatch') : null

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name || id}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full h-12 rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-700 outline-none transition-all focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/20 ${className || ''}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:text-slate-600"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {showStrength ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Password strength</span>
            <span className={`text-sm font-semibold ${getStrengthTone(validation.strength)}`}>
              {value ? (validation.strength === 'strong' ? 'Strong' : validation.strength === 'fair' ? 'Fair' : 'Weak') : 'Enter a password'}
            </span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${getStrengthBar(validation.strength)}`}
              style={{ width: `${value ? validation.score : 0}%` }}
            />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {requirementState.map((item) => (
              <li key={item.label} className={`flex items-center gap-2 text-sm ${item.passed ? 'text-emerald-700' : 'text-slate-600'}`}>
                <span className="text-base">{item.passed ? '✓' : '•'}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasConfirmValue ? (
        <div className={`text-sm font-medium ${matchState === 'match' ? 'text-emerald-700' : 'text-slate-600'}`}>
          {matchState === 'match' ? '✓ Passwords match' : matchState === 'mismatch' ? '✕ Passwords do not match' : null}
        </div>
      ) : null}
    </div>
  )
}
