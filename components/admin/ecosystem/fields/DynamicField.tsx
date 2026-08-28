'use client'

import { useState, useCallback } from 'react'
import type { CategoryField } from '@/lib/ecosystem/admin/categoryFieldRegistry'

type DynamicFieldProps = {
  field: CategoryField
  value: unknown
  onChange: (name: string, value: unknown) => void
}

export default function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const id = `cat-field-${field.name}`
  const colClass = field.colSpan === 2 ? 'sm:col-span-2' : ''

  const commonInputClass =
    'mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-accent-yellow/50 focus:ring-1 focus:ring-accent-yellow/30 transition-colors'
  const textareaClass =
    'mt-1 w-full rounded-xl border border-white/10 bg-[#0b1220] p-3 text-sm text-white outline-none focus:border-accent-yellow/50 focus:ring-1 focus:ring-accent-yellow/30 transition-colors min-h-[5rem] resize-y'

  // ─── Text / Email / Tel / URL / Number ───────────────────────

  if (['text', 'email', 'tel', 'url', 'number'].includes(field.type)) {
    return (
      <label className={`block ${colClass}`}>
        <FieldLabel field={field} />
        <input
          id={id}
          type={field.type === 'number' ? 'number' : field.type}
          value={value != null ? String(value) : ''}
          onChange={(e) => onChange(field.name, field.type === 'number' ? e.target.value : e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
          maxLength={field.validation?.maxLength}
          className={commonInputClass}
        />
        {field.helpText && <p className="mt-1 text-xs text-white/40">{field.helpText}</p>}
      </label>
    )
  }

  // ─── Textarea ────────────────────────────────────────────────

  if (field.type === 'textarea') {
    return (
      <label className={`block ${colClass}`}>
        <FieldLabel field={field} />
        <textarea
          id={id}
          value={value != null ? String(value) : ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          className={textareaClass}
        />
        {field.helpText && <p className="mt-1 text-xs text-white/40">{field.helpText}</p>}
      </label>
    )
  }

  // ─── Select ──────────────────────────────────────────────────

  if (field.type === 'select' || field.type === 'boolean-select') {
    return (
      <label className={`block ${colClass}`}>
        <FieldLabel field={field} />
        <select
          id={id}
          value={value != null ? String(value) : ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          className={commonInputClass + ' appearance-none cursor-pointer'}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {field.helpText && <p className="mt-1 text-xs text-white/40">{field.helpText}</p>}
      </label>
    )
  }

  // ─── Multiselect (checkboxes) ─────────────────────────────────

  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : []
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
      onChange(field.name, next)
    }

    return (
      <div className={`block ${colClass}`}>
        <FieldLabel field={field} />
        <div className="mt-2 flex flex-wrap gap-2">
          {(field.options || []).map((opt) => {
            const active = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'border-accent-yellow/60 bg-accent-yellow/15 text-accent-yellow'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white/80'
                }`}
              >
                {active && (
                  <svg className="mr-1.5 h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                )}
                {opt}
              </button>
            )
          })}
        </div>
        {field.helpText && <p className="mt-1 text-xs text-white/40">{field.helpText}</p>}
      </div>
    )
  }

  // ─── Tags ────────────────────────────────────────────────────

  if (field.type === 'tags') {
    return <TagFieldInline field={field} value={value} onChange={onChange} />
  }

  return null
}

// ─── Sub-components ────────────────────────────────────────────

function FieldLabel({ field }: { field: CategoryField }) {
  return (
    <span className="text-xs font-semibold text-white/60">
      {field.label}
      {field.required && <span className="ml-0.5 text-red-400">*</span>}
    </span>
  )
}

function TagFieldInline({
  field,
  value,
  onChange,
}: {
  field: CategoryField
  value: unknown
  onChange: (name: string, value: unknown) => void
}) {
  const tags = Array.isArray(value) ? (value as string[]) : []
  const [input, setInput] = useState('')

  const add = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange(field.name, [...tags, trimmed])
    setInput('')
  }, [input, tags, field.name, onChange])

  const remove = useCallback(
    (tag: string) => {
      onChange(
        field.name,
        tags.filter((t) => t !== tag)
      )
    },
    [tags, field.name, onChange]
  )

  return (
    <div className={`block ${field.colSpan === 2 ? 'sm:col-span-2' : ''}`}>
      <FieldLabel field={field} />
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="ml-0.5 text-white/40 hover:text-red-400 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={field.placeholder || 'Type and press Enter'}
          className="h-9 flex-1 rounded-lg border border-white/10 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-accent-yellow/50"
        />
        <button
          type="button"
          onClick={add}
          className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          Add
        </button>
      </div>
      {field.helpText && <p className="mt-1 text-xs text-white/40">{field.helpText}</p>}
    </div>
  )
}
