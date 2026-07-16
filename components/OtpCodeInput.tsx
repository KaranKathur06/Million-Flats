'use client'

import { useEffect, useRef } from 'react'

type OtpCodeInputProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

const INPUT_LENGTH = 6

export default function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  className = '',
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: INPUT_LENGTH }, (_, index) => value[index] || '')

  useEffect(() => {
    if (!autoFocus || disabled) return
    const firstEmpty = digits.findIndex((digit) => !digit)
    inputRefs.current[firstEmpty === -1 ? INPUT_LENGTH - 1 : firstEmpty]?.focus()
  }, [autoFocus, disabled])

  const updateValue = (nextDigits: string[]) => {
    onChange(nextDigits.join('').slice(0, INPUT_LENGTH))
  }

  const handleChange = (rawValue: string, index: number) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    updateValue(next)
    if (digit && index < INPUT_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !digits[index]) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, INPUT_LENGTH)

    if (!pasted) return
    const next = Array.from({ length: INPUT_LENGTH }, (_, index) => pasted[index] || '')
    updateValue(next)
    const focusIndex = Math.min(pasted.length, INPUT_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  return (
    <div className={className} onPaste={handlePaste}>
      <div className="grid grid-cols-6 gap-3 justify-center">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(event) => handleChange(event.target.value, index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="w-full h-16 text-center text-2xl font-semibold border border-gray-200 rounded-3xl bg-white shadow-sm focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/20 outline-none transition"
          />
        ))}
      </div>
    </div>
  )
}
