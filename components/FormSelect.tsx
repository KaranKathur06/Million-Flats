'use client'

import { useState } from 'react'
import SelectDropdown from './SelectDropdown'

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
  disabled
}: FormSelectProps) {
  const [val, setVal] = useState(defaultValue)

  return (
    <SelectDropdown
      name={name}
      label={label}
      value={val}
      onChange={setVal}
      options={options}
      placeholder={placeholder}
      variant={variant}
      dense={dense}
      showLabel={showLabel}
      className={className}
      disabled={disabled}
    />
  )
}
