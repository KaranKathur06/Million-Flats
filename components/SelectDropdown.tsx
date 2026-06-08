'use client'

import GlobalDropdown, { type GlobalDropdownOption } from '@/components/ui/GlobalDropdown'

export type SelectOption = GlobalDropdownOption

type Props = {
  name?: string
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  variant?: 'light' | 'dark'
  dense?: boolean
  showLabel?: boolean
  className?: string
  searchable?: boolean
  loadOptions?: () => Promise<SelectOption[]>
}

/** @deprecated Import GlobalDropdown from @/components/ui/GlobalDropdown */
export default function SelectDropdown({
  variant = 'light',
  searchable,
  loadOptions,
  onChange,
  ...props
}: Props) {
  return (
    <GlobalDropdown
      {...props}
      onChange={(v) => onChange(typeof v === 'string' ? v : v[0] || '')}
      mode="single"
      searchable={searchable}
      loadOptions={loadOptions}
      appearance={variant === 'dark' ? 'admin-dark' : 'admin-light'}
    />
  )
}
