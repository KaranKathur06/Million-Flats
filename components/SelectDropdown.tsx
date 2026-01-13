'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

export type SelectOption = {
  value: string
  label?: string
}

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  variant?: 'light' | 'dark'
  className?: string
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export default function SelectDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled,
  variant = 'light',
  className,
}: Props) {
  const id = useId()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [typeahead, setTypeahead] = useState('')

  const resolvedOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: SelectOption[] = []
    for (const o of options) {
      const v = typeof o?.value === 'string' ? o.value : String(o?.value ?? '')
      if (v === '' && !o?.label) continue
      const k = v === '' ? '__empty__' : normalize(v)
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ value: v, label: o.label ?? v })
    }
    return out
  }, [options])

  const selectedLabel = useMemo(() => {
    const hit = resolvedOptions.find((o) => normalize(o.value) === normalize(value))
    return hit?.label ?? (value ? value : '')
  }, [resolvedOptions, value])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (!rootRef.current?.contains(t)) {
        setOpen(false)
      }
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', onDocMouseDown)
      document.addEventListener('keydown', onDocKeyDown)
      return () => {
        document.removeEventListener('mousedown', onDocMouseDown)
        document.removeEventListener('keydown', onDocKeyDown)
      }
    }

    return
  }, [open])

  useEffect(() => {
    if (!open) return
    const i = resolvedOptions.findIndex((o) => normalize(o.value) === normalize(value))
    setActiveIndex(i >= 0 ? i : 0)
  }, [open, resolvedOptions, value])

  useEffect(() => {
    if (!open) return
    if (!listRef.current) return
    if (activeIndex < 0) return

    const el = listRef.current.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    if (!open) return
    if (!typeahead) return

    const q = normalize(typeahead)
    const idx = resolvedOptions.findIndex((o) => normalize(o.label ?? o.value).startsWith(q))
    if (idx >= 0) setActiveIndex(idx)

    const t = window.setTimeout(() => setTypeahead(''), 650)
    return () => window.clearTimeout(t)
  }, [open, resolvedOptions, typeahead])

  const baseLight =
    'w-full h-12 md:h-11 rounded-xl border bg-white text-dark-blue text-sm font-medium px-4 pr-11 flex items-center justify-between ' +
    'shadow-sm hover:shadow transition-shadow focus:outline-none focus:ring-2 focus:ring-dark-blue/25 focus:border-dark-blue/40 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed'

  const baseDark =
    'w-full h-12 md:h-14 rounded-xl border bg-white/10 text-white text-sm font-semibold px-4 pr-11 flex items-center justify-between ' +
    'hover:bg-white/15 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70 focus:border-white/30 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed'

  const base = variant === 'dark' ? baseDark : baseLight

  const labelClassName = variant === 'dark' ? 'text-white/80' : 'text-gray-600'
  const placeholderClassName = variant === 'dark' ? 'text-white/70' : 'text-gray-500'
  const valueClassName = variant === 'dark' ? 'text-white' : 'text-dark-blue'
  const caretClassName = variant === 'dark' ? 'text-white/70' : 'text-gray-500'
  const menuClassName = variant === 'dark' ? 'border-white/15 bg-[#0b1f33]/95 backdrop-blur-md' : 'border-gray-200 bg-white'
  const emptyClassName = variant === 'dark' ? 'text-white/70' : 'text-gray-500'

  return (
    <div
      ref={rootRef}
      className={`${open ? 'relative z-50' : 'relative z-0'}${className ? ` ${className}` : ''}`}
    >
      <label htmlFor={id} className={`block text-xs font-semibold mb-1 ${labelClassName}`}>
        {label}
      </label>

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
              setActiveIndex((i) => Math.min(i + 1, resolvedOptions.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Home') {
              e.preventDefault()
              setActiveIndex(0)
            } else if (e.key === 'End') {
              e.preventDefault()
              setActiveIndex(resolvedOptions.length - 1)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const opt = resolvedOptions[activeIndex]
              if (opt) onChange(opt.value)
              setOpen(false)
              buttonRef.current?.focus()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setOpen(false)
              buttonRef.current?.focus()
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              setTypeahead((s) => s + e.key)
            }
          }}
          className={`${base} ${
            open
              ? variant === 'dark'
                ? 'border-white/30 ring-2 ring-white/10'
                : 'border-dark-blue/40 ring-2 ring-dark-blue/15'
              : variant === 'dark'
                ? 'border-white/15'
                : 'border-gray-200'
          }`}
        >
          <span className={`truncate ${selectedLabel ? valueClassName : placeholderClassName}`}>
            {selectedLabel || placeholder}
          </span>

          <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${caretClassName}`}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <div
          className={`absolute z-50 left-0 right-0 mt-2 origin-top rounded-2xl border shadow-xl overflow-hidden transition-all duration-150 ${menuClassName} ${
            open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div ref={listRef} role="listbox" aria-label={label} className="max-h-64 overflow-auto py-1">
            {resolvedOptions.length === 0 ? (
              <div className={`px-4 py-3 text-sm ${emptyClassName}`}>No options</div>
            ) : (
              resolvedOptions.map((o, idx) => {
                const selected = normalize(o.value) === normalize(value)
                const active = idx === activeIndex

                return (
                  <button
                    key={`${o.value}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-option-index={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onChange(o.value)
                      setOpen(false)
                      buttonRef.current?.focus()
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      variant === 'dark'
                        ? selected
                          ? 'bg-white text-dark-blue'
                          : active
                            ? 'bg-white/10 text-white'
                            : 'bg-transparent text-white/85'
                        : selected
                          ? 'bg-dark-blue text-white'
                          : active
                            ? 'bg-gray-50 text-dark-blue'
                            : 'bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
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
                    </div>
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
