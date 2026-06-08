'use client'

import { useEffect, useRef, useState } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM DROPDOWN — Custom select with dark/light themes
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DropdownOption {
    value: string
    label: string
}

interface PremiumDropdownProps {
    /** Visual label above the trigger */
    label?: string
    /** Icon node rendered before the label */
    icon?: React.ReactNode
    /** Current value */
    value: string
    /** Change handler */
    onChange: (value: string) => void
    /** Options list — first option is usually the "all" placeholder */
    options: DropdownOption[]
    /** Disabled state */
    disabled?: boolean
    /** Visual variant */
    variant?: 'dark' | 'light'
    /** Width class override */
    className?: string
    /** z-index for stacking */
    zIndex?: number
    /** Unique identifier for accessibility */
    id?: string
}

export default function PremiumDropdown({
    label,
    icon,
    value,
    onChange,
    options,
    disabled = false,
    variant = 'dark',
    className = '',
    zIndex = 10,
    id,
}: PremiumDropdownProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const selectedOption = options.find((o) => o.value === value)
    const displayLabel = selectedOption?.label || options[0]?.label || label || 'Select'

    // Close on click outside
    useEffect(() => {
        if (!open) return
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    // Close on Escape
    useEffect(() => {
        if (!open) return
        function handleEsc(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [open])

    // Scroll selected item into view when opening
    useEffect(() => {
        if (open && listRef.current) {
            const selected = listRef.current.querySelector('[data-selected="true"]')
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' })
            }
        }
    }, [open])

    const isDark = variant === 'dark'

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
            style={{ zIndex: open ? 999 : zIndex }}
        >
            {/* Label */}
            {label && (
                <div className="flex items-center gap-1.5 px-1 mb-1">
                    {icon && (
                        <span className={isDark ? 'text-amber-400/70' : 'text-amber-600/70'}>
                            {icon}
                        </span>
                    )}
                    <span className={[
                        'text-[10px] font-bold uppercase tracking-[0.12em]',
                        isDark ? 'text-white/35' : 'text-gray-400',
                    ].join(' ')}>
                        {label}
                    </span>
                </div>
            )}

            {/* Trigger button */}
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => !disabled && setOpen((v) => !v)}
                className={[
                    'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-left text-sm font-medium',
                    'transition-all duration-200 focus:outline-none',
                    // Dark variant
                    isDark && !open && !disabled
                        ? 'bg-white/[0.06] border border-white/[0.10] text-white/90 hover:bg-white/[0.10] hover:border-white/[0.18]'
                        : '',
                    isDark && open
                        ? 'bg-white/[0.09] border border-amber-400/40 ring-1 ring-amber-400/20 text-white'
                        : '',
                    // Light variant
                    !isDark && !open && !disabled
                        ? 'bg-white border border-gray-200 text-gray-700 shadow-sm hover:shadow-md hover:border-gray-300'
                        : '',
                    !isDark && open
                        ? 'bg-white border border-amber-400 ring-2 ring-amber-400/20 text-gray-900 shadow-md'
                        : '',
                    disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                ].filter(Boolean).join(' ')}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className="truncate">{displayLabel}</span>

                {/* Animated chevron */}
                <svg
                    className={[
                        'flex-shrink-0 transition-transform duration-200',
                        open ? 'rotate-180' : '',
                        isDark ? 'text-white/30' : 'text-gray-400',
                    ].join(' ')}
                    width="12"
                    height="12"
                    viewBox="0 0 20 20"
                    fill="none"
                >
                    <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Dropdown panel */}
            {open && (
                <div
                    className={[
                        'absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden',
                        'animate-in fade-in slide-in-from-top-1 duration-150',
                        isDark
                            ? 'bg-[#0b1d33]/98 backdrop-blur-xl border border-white/[0.10] shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                            : 'bg-white border border-gray-200 shadow-[0_12px_40px_rgba(0,0,0,0.12)]',
                    ].join(' ')}
                    style={{ zIndex: 9999 }}
                >
                    {/* Top accent line */}
                    <div className={[
                        'h-[2px] w-full',
                        isDark
                            ? 'bg-gradient-to-r from-transparent via-amber-400/50 to-transparent'
                            : 'bg-gradient-to-r from-transparent via-amber-400 to-transparent',
                    ].join(' ')} />

                    <div
                        ref={listRef}
                        className="max-h-60 overflow-y-auto py-1 scrollbar-thin"
                        role="listbox"
                    >
                        {options.map((opt, idx) => {
                            const isSelected = opt.value === value
                            return (
                                <button
                                    key={`${opt.value}-${idx}`}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    data-selected={isSelected}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        onChange(opt.value)
                                        setOpen(false)
                                    }}
                                    className={[
                                        'w-full text-left px-4 py-2.5 text-[13px] flex items-center justify-between gap-3',
                                        'transition-colors duration-75',
                                        // Dark variant items
                                        isDark && isSelected
                                            ? 'bg-amber-400/[0.12] text-amber-300 font-semibold'
                                            : '',
                                        isDark && !isSelected
                                            ? 'text-white/70 hover:bg-white/[0.06] hover:text-white/95'
                                            : '',
                                        // Light variant items
                                        !isDark && isSelected
                                            ? 'bg-amber-50 text-amber-800 font-semibold'
                                            : '',
                                        !isDark && !isSelected
                                            ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            : '',
                                    ].filter(Boolean).join(' ')}
                                >
                                    <span className="truncate">{opt.label}</span>

                                    {/* Check icon for selected */}
                                    {isSelected && (
                                        <svg
                                            className={isDark ? 'text-amber-400 flex-shrink-0' : 'text-amber-600 flex-shrink-0'}
                                            width="14"
                                            height="14"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                        >
                                            <path
                                                d="M16.5 5.5l-8 8-4-4"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
