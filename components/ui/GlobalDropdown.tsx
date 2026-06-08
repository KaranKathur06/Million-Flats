'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'

export type GlobalDropdownOption = {
  value: string
  label?: string
}

export type GlobalDropdownProps = {
  name?: string
  label?: string
  value: string | string[]
  onChange: (value: string | string[]) => void
  options?: GlobalDropdownOption[]
  loadOptions?: () => Promise<GlobalDropdownOption[]>
  placeholder?: string
  disabled?: boolean
  mode?: 'single' | 'multi'
  searchable?: boolean
  appearance?: 'admin-light' | 'admin-dark' | 'premium-light' | 'premium-dark'
  dense?: boolean
  showLabel?: boolean
  className?: string
  icon?: ReactNode
  zIndex?: number
  id?: string
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function resolveAppearance(appearance: GlobalDropdownProps['appearance']) {
  switch (appearance) {
    case 'admin-dark':
      return { variant: 'dark' as const, premium: false }
    case 'premium-light':
      return { variant: 'light' as const, premium: true }
    case 'premium-dark':
      return { variant: 'dark' as const, premium: true }
    default:
      return { variant: 'light' as const, premium: false }
  }
}

export default function GlobalDropdown({
  name,
  label = '',
  value,
  onChange,
  options = [],
  loadOptions,
  placeholder = 'Select',
  disabled,
  mode = 'single',
  searchable = false,
  appearance = 'admin-light',
  dense = false,
  showLabel = true,
  className,
  icon,
  zIndex = 10,
  id: idProp,
}: GlobalDropdownProps) {
  const generatedId = useId()
  const id = idProp || generatedId
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [typeahead, setTypeahead] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [asyncOptions, setAsyncOptions] = useState<GlobalDropdownOption[]>([])
  const [loading, setLoading] = useState(false)

  const { variant, premium } = resolveAppearance(appearance)
  const isMulti = mode === 'multi'
  const selectedValues = useMemo(
    () => (isMulti ? (Array.isArray(value) ? value : []) : [typeof value === 'string' ? value : '']),
    [isMulti, value]
  )

  const loadAsyncOptions = useCallback(async () => {
    if (!loadOptions) return
    setLoading(true)
    try {
      const loaded = await loadOptions()
      setAsyncOptions(loaded)
    } finally {
      setLoading(false)
    }
  }, [loadOptions])

  useEffect(() => {
    if (open && loadOptions) void loadAsyncOptions()
  }, [open, loadOptions, loadAsyncOptions])

  const sourceOptions = loadOptions ? asyncOptions : options

  const resolvedOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: GlobalDropdownOption[] = []
    for (const o of sourceOptions) {
      const v = typeof o?.value === 'string' ? o.value : String(o?.value ?? '')
      if (v === '' && !o?.label) continue
      const k = v === '' ? '__empty__' : normalize(v)
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ value: v, label: o.label ?? v })
    }
    return out
  }, [sourceOptions])

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return resolvedOptions
    const q = normalize(searchQuery)
    return resolvedOptions.filter((o) => normalize(o.label ?? o.value).includes(q))
  }, [resolvedOptions, searchable, searchQuery])

  const selectedLabel = useMemo(() => {
    if (isMulti) {
      if (selectedValues.length === 0) return ''
      const labels = selectedValues
        .map((v) => resolvedOptions.find((o) => normalize(o.value) === normalize(v))?.label ?? v)
        .filter(Boolean)
      return labels.join(', ')
    }
    const hit = resolvedOptions.find((o) => normalize(o.value) === normalize(selectedValues[0] || ''))
    return hit?.label ?? (selectedValues[0] ? selectedValues[0] : '')
  }, [isMulti, resolvedOptions, selectedValues])

  const pickOption = (optValue: string) => {
    if (isMulti) {
      const set = new Set(selectedValues)
      if (set.has(optValue)) set.delete(optValue)
      else set.add(optValue)
      onChange(Array.from(set))
      return
    }
    onChange(optValue)
    setOpen(false)
    buttonRef.current?.focus()
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (!rootRef.current?.contains(t)) setOpen(false)
    }
    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onDocMouseDown)
      document.addEventListener('keydown', onDocKeyDown)
      if (searchable) searchRef.current?.focus()
      return () => {
        document.removeEventListener('mousedown', onDocMouseDown)
        document.removeEventListener('keydown', onDocKeyDown)
      }
    }
    return
  }, [open, searchable])

  useEffect(() => {
    if (!open) return
    const i = filteredOptions.findIndex((o) => normalize(o.value) === normalize(selectedValues[0] || ''))
    setActiveIndex(i >= 0 ? i : 0)
  }, [open, filteredOptions, selectedValues])

  useEffect(() => {
    if (!open || !listRef.current || activeIndex < 0) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    if (!open || !typeahead) return
    const q = normalize(typeahead)
    const idx = filteredOptions.findIndex((o) => normalize(o.label ?? o.value).startsWith(q))
    if (idx >= 0) setActiveIndex(idx)
    const t = window.setTimeout(() => setTypeahead(''), 650)
    return () => window.clearTimeout(t)
  }, [open, filteredOptions, typeahead])

  const isDark = variant === 'dark'

  const triggerClass = premium
    ? [
        'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-200 focus:outline-none',
        isDark && !open && !disabled
          ? 'bg-white/[0.06] border border-white/[0.10] text-white/90 hover:bg-white/[0.10] hover:border-white/[0.18]'
          : '',
        isDark && open ? 'bg-white/[0.09] border border-amber-400/40 ring-1 ring-amber-400/20 text-white' : '',
        !isDark && !open && !disabled
          ? 'bg-white border border-gray-200 text-gray-700 shadow-sm hover:shadow-md hover:border-gray-300'
          : '',
        !isDark && open ? 'bg-white border border-amber-400 ring-2 ring-amber-400/20 text-gray-900 shadow-md' : '',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')
    : [
        `w-full ${dense ? 'h-10' : 'h-12 md:h-11'} rounded-xl border text-[13px] font-medium px-4 pr-11 flex items-center justify-between shadow-sm hover:shadow transition-shadow focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`,
        isDark
          ? 'bg-white/[0.04] border-white/[0.08] text-white/90 hover:bg-white/[0.06] hover:border-white/[0.12] focus:border-amber-400/30'
          : 'bg-white text-dark-blue border-gray-200 focus:ring-2 focus:ring-dark-blue/25 focus:border-dark-blue/40',
        open
          ? isDark
            ? 'border-amber-400/30 ring-2 ring-amber-400/10'
            : 'border-dark-blue/40 ring-2 ring-dark-blue/15'
          : isDark
            ? 'border-white/[0.08]'
            : 'border-gray-200',
      ].join(' ')

  const menuClass = premium
    ? isDark
      ? 'bg-[#0b1d33]/98 backdrop-blur-xl border border-white/[0.10] shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      : 'bg-white border border-gray-200 shadow-[0_12px_40px_rgba(0,0,0,0.12)]'
    : isDark
      ? 'border-white/[0.08] bg-[#0a1019] shadow-2xl'
      : 'border-gray-200 bg-white'

  const labelClass = premium
    ? ['text-[10px] font-bold uppercase tracking-[0.12em]', isDark ? 'text-white/35' : 'text-gray-400'].join(' ')
    : `block text-xs font-semibold mb-1 ${isDark ? 'text-white/80' : 'text-gray-600'}`

  const hiddenValue = isMulti ? selectedValues.join(',') : selectedValues[0] || ''

  return (
    <div
      ref={rootRef}
      className={`${open ? 'relative z-50' : 'relative z-0'}${className ? ` ${className}` : ''}`}
      style={{ zIndex: open ? 999 : zIndex }}
    >
      {showLabel && label ? (
        premium ? (
          <div className="flex items-center gap-1.5 px-1 mb-1">
            {icon ? <span className={isDark ? 'text-amber-400/70' : 'text-amber-600/70'}>{icon}</span> : null}
            <span className={labelClass}>{label}</span>
          </div>
        ) : (
          <label htmlFor={id} className={labelClass}>
            {label}
          </label>
        )
      ) : null}

      {name ? <input type="hidden" name={name} value={hiddenValue} /> : null}

      <div className="relative">
        <button
          id={id}
          ref={buttonRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            if (disabled) return
            setOpen((v) => !v)
          }}
          onKeyDown={(e) => {
            if (disabled) return
            if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              setOpen(true)
              return
            }
            if (!open) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Home') {
              e.preventDefault()
              setActiveIndex(0)
            } else if (e.key === 'End') {
              e.preventDefault()
              setActiveIndex(filteredOptions.length - 1)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const opt = filteredOptions[activeIndex]
              if (opt) pickOption(opt.value)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setOpen(false)
              buttonRef.current?.focus()
            } else if (e.key === 'Tab') {
              setOpen(false)
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !searchable) {
              setTypeahead((s) => s + e.key)
            }
          }}
          className={triggerClass}
        >
          <span
            className={`truncate ${
              selectedLabel
                ? isDark
                  ? 'text-white/90'
                  : premium
                    ? isDark
                      ? 'text-white'
                      : 'text-gray-900'
                    : 'text-dark-blue'
                : isDark
                  ? 'text-white/40'
                  : 'text-gray-500'
            }`}
          >
            {selectedLabel || placeholder}
          </span>

          <span
            className={`${premium ? '' : 'absolute right-4 top-1/2 -translate-y-1/2'} ${isDark ? 'text-white/40' : 'text-gray-500'}`}
          >
            <svg
              className={premium ? `flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}` : ''}
              width={premium ? 12 : 16}
              height={premium ? 12 : 16}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <div
          className={`absolute z-50 left-0 right-0 mt-2 origin-top rounded-2xl border overflow-hidden transition-all duration-150 ${menuClass} ${
            open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {premium ? (
            <div
              className={`h-[2px] w-full ${
                isDark
                  ? 'bg-gradient-to-r from-transparent via-amber-400/50 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-amber-400 to-transparent'
              }`}
            />
          ) : null}

          {searchable ? (
            <div className={`p-2 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-100'}`}>
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setActiveIndex(0)
                }}
                placeholder="Search…"
                className={`w-full h-9 rounded-lg px-3 text-sm outline-none ${
                  isDark ? 'bg-white/[0.06] text-white placeholder:text-white/40' : 'bg-gray-50 text-dark-blue'
                }`}
              />
            </div>
          ) : null}

          <div ref={listRef} role="listbox" aria-label={label || placeholder} className="max-h-64 overflow-auto py-1 scrollbar-thin">
            {loading ? (
              <div className={`px-4 py-3 text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Loading…</div>
            ) : filteredOptions.length === 0 ? (
              <div className={`px-4 py-3 text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>No options</div>
            ) : (
              filteredOptions.map((o, idx) => {
                const selected = selectedValues.some((v) => normalize(v) === normalize(o.value))
                const active = idx === activeIndex

                const itemClass = premium
                  ? [
                      'w-full text-left px-4 py-2.5 text-[13px] flex items-center justify-between gap-3 transition-colors duration-75',
                      isDark && selected ? 'bg-amber-400/[0.12] text-amber-300 font-semibold' : '',
                      isDark && !selected ? 'text-white/70 hover:bg-white/[0.06] hover:text-white/95' : '',
                      !isDark && selected ? 'bg-amber-50 text-amber-800 font-semibold' : '',
                      !isDark && !selected ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : `w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                      isDark
                        ? selected
                          ? 'bg-white/[0.06] text-white font-medium'
                          : active
                            ? 'bg-white/[0.03] text-white/90'
                            : 'bg-transparent text-white/60'
                        : selected
                          ? 'bg-dark-blue text-white'
                          : active
                            ? 'bg-gray-50 text-dark-blue'
                            : 'bg-white text-gray-700'
                    }`

                return (
                  <button
                    key={`${o.value}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-option-index={idx}
                    data-selected={selected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pickOption(o.value)
                    }}
                    className={itemClass}
                  >
                    <span className="truncate">{o.label ?? o.value}</span>
                    {selected ? (
                      <span className="shrink-0">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="M16.5 5.5l-8 8-4-4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
