'use client'

import GlobalDropdown, { type GlobalDropdownOption } from '@/components/ui/GlobalDropdown'

export interface DropdownOption {
  value: string
  label: string
}

interface PremiumDropdownProps {
  label?: string
  icon?: React.ReactNode
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  disabled?: boolean
  variant?: 'dark' | 'light'
  className?: string
  zIndex?: number
  id?: string
  searchable?: boolean
  loadOptions?: () => Promise<DropdownOption[]>
  showLabel?: boolean
}

/** @deprecated Import GlobalDropdown from @/components/ui/GlobalDropdown */
export default function PremiumDropdown({
  variant = 'dark',
  searchable,
  loadOptions,
  showLabel = true,
  onChange,
  ...props
}: PremiumDropdownProps) {
  return (
    <GlobalDropdown
      {...props}
      onChange={(v) => onChange(typeof v === 'string' ? v : v[0] || '')}
      mode="single"
      searchable={searchable}
      loadOptions={loadOptions}
      showLabel={showLabel}
      appearance={variant === 'dark' ? 'premium-dark' : 'premium-light'}
    />
  )
}
