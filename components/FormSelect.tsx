'use client'

import { useEffect, useState } from 'react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'

interface FormSelectProps {
  name: string
  label?: string
  defaultValue?: string
  options: { value: string; label?: string }[]
  placeholder?: string
  variant?: 'light' | 'dark'
  dense?: boolean
  showLabel?: boolean
  className?: string
  disabled?: boolean
  searchable?: boolean
  onValueChange?: (value: string) => void
}

export default function FormSelect({
  name,
  label = '',
  defaultValue = '',
  options,
  placeholder,
  variant = 'dark',
  dense = false,
  showLabel = false,
  className,
  disabled,
  searchable,
  onValueChange,
}: FormSelectProps) {
  const [val, setVal] = useState(defaultValue)

  useEffect(() => {
    setVal(defaultValue)
  }, [defaultValue])

  return (
    <GlobalDropdown
      name={name}
      label={label}
      value={val}
      onChange={(v) => {
        const next = typeof v === 'string' ? v : v[0] || ''
        setVal(next)
        onValueChange?.(next)
      }}
      options={options}
      placeholder={placeholder}
      appearance={variant === 'dark' ? 'admin-dark' : 'admin-light'}
      dense={dense}
      showLabel={showLabel}
      className={className}
      disabled={disabled}
      searchable={searchable}
      mode="single"
    />
  )
}
