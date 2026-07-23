'use client'

import { useEffect, useMemo, useState } from 'react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { getCityOptions, getCountryName, getCountryOptions, parseCityName, type CityOption } from '@/lib/locations'

type SelectorAppearance = 'admin-light' | 'admin-dark' | 'premium-light' | 'premium-dark'

export function CountrySelector({
  value,
  onChange,
  label = 'Country',
  placeholder = 'Search country',
  appearance = 'premium-light',
  className,
}: {
  value: string
  onChange: (country: { code: string; name: string }) => void
  label?: string
  placeholder?: string
  appearance?: SelectorAppearance
  className?: string
}) {
  const options = useMemo(() => getCountryOptions(), [])

  return (
    <GlobalDropdown
      label={label}
      value={value}
      onChange={(next) => {
        const code = String(next || '').toUpperCase()
        onChange({ code, name: getCountryName(code) })
      }}
      options={options}
      placeholder={placeholder}
      searchable
      appearance={appearance}
      className={className}
      renderOption={(option) => (
        <span className="flex items-center justify-between gap-3">
          <span className="truncate">{option.label}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-45">{option.region}</span>
        </span>
      )}
    />
  )
}

export function CitySelector({
  countryCode,
  value,
  onChange,
  label = 'City',
  placeholder = 'Search city',
  appearance = 'premium-light',
  disabled,
  className,
}: {
  countryCode: string
  value: string
  onChange: (city: { id: string; name: string }) => void
  label?: string
  placeholder?: string
  appearance?: SelectorAppearance
  disabled?: boolean
  className?: string
}) {
  const [options, setOptions] = useState<CityOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getCityOptions(countryCode)
      .then((next) => {
        if (alive) setOptions(next)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [countryCode])

  const resolvedValue = useMemo(() => {
    if (!value) return ''
    const hit = options.find((option) => option.id === value || option.name.toLowerCase() === value.toLowerCase())
    return hit?.id || value
  }, [options, value])

  return (
    <GlobalDropdown
      label={label}
      value={resolvedValue}
      onChange={(next) => {
        const id = String(next || '')
        const hit = options.find((option) => option.id === id)
        onChange({ id, name: hit?.name || parseCityName(id) })
      }}
      options={options}
      placeholder={loading ? 'Loading cities...' : placeholder}
      searchable
      disabled={disabled || !countryCode || loading}
      appearance={appearance}
      className={className}
      renderOption={(option) => (
        <span className="flex items-center justify-between gap-3">
          <span className="truncate">{option.label}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-45">{option.group}</span>
        </span>
      )}
    />
  )
}
