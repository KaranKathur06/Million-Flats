'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SelectDropdown from '@/components/SelectDropdown'
import UploadBox from '@/components/admin/UploadBox'

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

// ─── Types ──────────────────────────────────────────────────
export interface DeveloperFormData {
  name: string
  slug: string
  countryCode: string
  countryIso2: string
  city: string
  logo: string // final URL stored in DB
  banner: string // final URL stored in DB
  shortDescription: string
  description: string
  website: string
  foundedYear: string
  isFeatured: boolean
  featuredRank: string
  status: string
}

export const emptyDeveloperForm: DeveloperFormData = {
  name: '',
  slug: '',
  countryCode: 'UAE',
  countryIso2: 'AE',
  city: '',
  logo: '',
  banner: '',
  shortDescription: '',
  description: '',
  website: '',
  foundedYear: '',
  isFeatured: false,
  featuredRank: '',
  status: 'ACTIVE',
}

interface DeveloperFormProps {
  isEditMode?: boolean
  developerId?: string
  initial?: Partial<DeveloperFormData>
}


// ─── Form Input ──────────────────────────────────────────────
function FormInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  hint,
  mono,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  hint?: string
  mono?: boolean
  maxLength?: number
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all ${mono ? 'font-mono text-white/70' : ''}`}
      />
      {hint && <p className="mt-1.5 text-[11px] text-white/25">{hint}</p>}
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────
function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-5 flex items-center gap-2">
      <span className="h-5 w-5 rounded-md bg-amber-400/15 flex items-center justify-center text-amber-400 text-[10px] font-bold">
        {num}
      </span>
      {title}
    </h3>
  )
}

// ─── Main Component ──────────────────────────────────────────
export default function DeveloperForm({ isEditMode = false, developerId, initial = {} }: DeveloperFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<DeveloperFormData>({ ...emptyDeveloperForm, ...initial })
  const [autoSlug, setAutoSlug] = useState(!isEditMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const update = (field: keyof DeveloperFormData, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && autoSlug && typeof value === 'string') {
        next.slug = slugify(value)
      }
      if (field === 'countryCode' && typeof value === 'string') {
        next.countryIso2 = value === 'INDIA' ? 'IN' : 'AE'
      }
      return next
    })
    if (fieldErrors[field]) setFieldErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Developer name is required'
    if (!form.countryCode) errs.countryCode = 'Country is required'
    if (!form.shortDescription.trim()) errs.shortDescription = 'Short description is required'
    if (form.shortDescription.length > 500) errs.shortDescription = 'Max 500 characters'
    if (form.isFeatured && !form.featuredRank) errs.featuredRank = 'Featured rank is required when featured'
    if (form.website && !form.website.startsWith('http')) errs.website = 'Website must start with http:// or https://'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setError('')
    setSuccess('')

    const payload: any = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      countryCode: form.countryCode,
      countryIso2: form.countryIso2,
      city: form.city.trim() || undefined,
      logo: form.logo.trim() || null,
      banner: form.banner.trim() || null,
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      website: form.website.trim() || null,
      foundedYear: form.foundedYear ? parseInt(form.foundedYear) : null,
      isFeatured: form.isFeatured,
      featuredRank: form.featuredRank ? parseInt(form.featuredRank) : null,
      status: form.status,
    }

    try {
      const url = isEditMode ? `/api/admin/developers/${developerId}` : '/api/admin/developers'
      const method = isEditMode ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Failed')

      setSuccess(isEditMode ? 'Developer updated successfully' : 'Developer created successfully')
      setTimeout(() => router.push('/admin/developers'), 1000)
    } catch (err: any) {
      setError(err.message || 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const logoSlug = form.slug || form.name ? slugify(form.name || 'developer') : 'developer'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Feedback ── */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-2">
          <svg className="h-4 w-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-2">
          <svg className="h-4 w-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      {/* ── Section 1: Basic Info ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <SectionHeader num={1} title="Basic Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <FormInput
              label="Developer Name"
              value={form.name}
              onChange={(v) => update('name', v)}
              placeholder="e.g. DAMAC Properties"
              required
            />
            {fieldErrors.name && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.name}</p>}
          </div>
          <div>
            <FormInput
              label="Slug"
              value={form.slug}
              onChange={(v) => { setAutoSlug(false); update('slug', v) }}
              placeholder="auto-generated"
              hint={`URL: /developers/${form.slug || '…'}`}
              mono
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
              Country <span className="text-red-400">*</span>
            </label>
            <SelectDropdown
              label="Country"
              showLabel={false}
              variant="dark"
              value={form.countryCode}
              onChange={(v) => update('countryCode', v)}
              options={[
                { value: 'UAE', label: '🇦🇪 UAE' },
                { value: 'INDIA', label: '🇮🇳 India' },
              ]}
            />
            {fieldErrors.countryCode && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.countryCode}</p>}
          </div>
          <FormInput
            label="City"
            value={form.city}
            onChange={(v) => update('city', v)}
            placeholder="e.g. Dubai, Ahmedabad"
          />
        </div>
      </div>

      {/* ── Section 2: Media ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <SectionHeader num={2} title="Media" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Logo */}
          <div>
            <UploadBox
              label="Logo"
              hint="Square image recommended (200×200). PNG, JPG, WebP. Max 5MB."
              uploadData={{ type: 'logo', developerSlug: logoSlug }}
              currentUrl={form.logo}
              onUploaded={(url) => update('logo', url)}
              aspectRatio="square"
            />
          </div>
          {/* Banner */}
          <div>
            <UploadBox
              label="Banner"
              hint="Recommended 1200×400. Wide landscape image. Max 5MB."
              uploadData={{ type: 'banner', developerSlug: logoSlug }}
              currentUrl={form.banner}
              onUploaded={(url) => update('banner', url)}
              aspectRatio="banner"
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: Details ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <SectionHeader num={3} title="Details" />
        <div className="space-y-5">
          <div>
            <FormInput
              label="Short Description"
              value={form.shortDescription}
              onChange={(v) => update('shortDescription', v)}
              placeholder="One-line tagline (max 200 chars)"
              maxLength={200}
              required
            />
            <div className="flex items-center justify-between mt-1">
              {fieldErrors.shortDescription
                ? <p className="text-[11px] text-red-400">{fieldErrors.shortDescription}</p>
                : <span />}
              <p className={`text-[11px] ${form.shortDescription.length > 180 ? 'text-amber-400' : 'text-white/25'}`}>
                {form.shortDescription.length}/200
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
              Full Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={5}
              placeholder="Detailed developer description (minimum recommended 100 chars)…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FormInput
                label="Website"
                value={form.website}
                onChange={(v) => update('website', v)}
                placeholder="https://www.example.com"
              />
              {fieldErrors.website && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.website}</p>}
            </div>
            <FormInput
              label="Founded Year"
              value={form.foundedYear}
              onChange={(v) => update('foundedYear', v)}
              placeholder="e.g. 2002"
              type="number"
              hint="Year the company was founded"
            />
          </div>
        </div>
      </div>

      {/* ── Section 4: Feature Settings ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <SectionHeader num={4} title="Feature Settings" />
        <div className="flex items-center gap-6 flex-wrap">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => update('isFeatured', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 rounded-full bg-white/[0.08] peer-checked:bg-amber-400/60 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              Featured Developer
            </span>
          </label>

          {form.isFeatured && (
            <div className="w-36">
              <FormInput
                label="Featured Rank"
                value={form.featuredRank}
                onChange={(v) => update('featuredRank', v)}
                placeholder="1"
                type="number"
                required
              />
              {fieldErrors.featuredRank && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.featuredRank}</p>}
            </div>
          )}
        </div>

        {form.isFeatured && !form.logo && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Featured developers should have a logo uploaded for best display on the homepage.
          </div>
        )}
      </div>

      {/* ── Section 5: Status ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <SectionHeader num={5} title="Status" />
        <div className="flex gap-3">
          {(['ACTIVE', 'INACTIVE'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update('status', s)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                form.status === s
                  ? s === 'ACTIVE'
                    ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25'
                    : 'bg-red-400/15 text-red-300 border-red-400/25'
                  : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              {s === 'ACTIVE' ? '● Active' : '○ Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="pt-6 flex items-center justify-end gap-3 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => router.push('/admin/developers')}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.08] hover:text-white transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !!success}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {isEditMode ? 'Updating…' : 'Creating…'}
            </>
          ) : isEditMode ? (
            'Update Developer'
          ) : (
            'Create Developer'
          )}
        </button>
      </div>
    </form>
  )
}
