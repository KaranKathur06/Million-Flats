'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SelectDropdown from '@/components/SelectDropdown'
import { THREE_D_TOUR_EVENTS, trackThreeDTourEvent } from '@/lib/three-d-tour/trackDemo'
import {
  AREA_UNIT_OPTIONS,
  BUDGET_RANGE_OPTIONS,
  INQUIRY_TYPE_OPTIONS,
  PROJECT_SCOPE_OPTIONS,
  SERVICE_REQUIREMENT_OPTIONS,
  TIMELINE_OPTIONS,
  budgetRangeLabel,
  inquiryTypeLabel,
  timelineLabel,
} from '@/lib/leads/threeDTour'

const STEPS = [
  'Contact information',
  'Project details',
  'Services',
  'Budget & timeline',
  'Review & submit',
] as const
const TOTAL_STEPS = STEPS.length
const DRAFT_STORAGE_KEY = 'mf_3d_tour_draft_v1'

const BENEFITS = [
  'Sell faster with immersive 3D walkthroughs',
  'Reach remote & international buyers',
  'Premium marketing for luxury projects',
  'Matterport-certified delivery',
  'Typical delivery from 48–72 hours',
] as const

/** Match global form controls (see SelectDropdown light + admin/public forms). */
const WIZARD_LABEL_CLASS = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1'
const WIZARD_INPUT_CLASS =
  'w-full h-10 md:h-11 px-4 rounded-xl border border-gray-200 bg-white text-[13px] font-medium text-dark-blue shadow-sm ' +
  'hover:shadow transition-shadow focus:outline-none focus:ring-2 focus:ring-dark-blue/25 focus:border-dark-blue/40'

const SERVICE_ICONS: Record<string, string> = {
  '3D_WALKTHROUGH': '🏠',
  MATTERPORT_SCAN: '📷',
  VIRTUAL_STAGING: '✨',
  DRONE_SHOOT: '🚁',
  HDR_PHOTOGRAPHY: '🌅',
  FLOOR_PLAN: '📐',
  VIDEO_TOUR: '🎬',
  CUSTOM_BRANDING: '🎨',
}

type Profile = {
  name: string
  email: string
  phone: string
  country: string
  city: string
  countryCode: string
}

export type WizardFormState = {
  name: string
  email: string
  phone: string
  city: string
  countryCode: 'INDIA' | 'UAE'
  inquiryType: string
  propertyName: string
  projectName: string
  propertyAddress: string
  propertyCity: string
  state: string
  propertyCountry: string
  pinCode: string
  builtUpArea: string
  areaUnit: string
  serviceRequirements: string[]
  projectScope: string
  timeline: string
  budgetRange: string
  additionalNotes: string
}

const initialForm: WizardFormState = {
  name: '',
  email: '',
  phone: '',
  city: '',
  countryCode: 'INDIA',
  inquiryType: 'DEVELOPER_PROJECT',
  propertyName: '',
  projectName: '',
  propertyAddress: '',
  propertyCity: '',
  state: '',
  propertyCountry: '',
  pinCode: '',
  builtUpArea: '',
  areaUnit: 'SQ_FT',
  serviceRequirements: [],
  projectScope: 'SINGLE_UNIT',
  timeline: 'WITHIN_30_DAYS',
  budgetRange: 'NEED_CONSULTATION',
  additionalNotes: '',
}

type Props = {
  variant?: 'modal' | 'page'
  onSuccess?: (leadId?: string) => void
  onCancel?: () => void
}

function WizardSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <div>
      <label className={WIZARD_LABEL_CLASS}>{label}</label>
      <SelectDropdown
        label={label}
        showLabel={false}
        variant="light"
        dense
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
      />
    </div>
  )
}

function BenefitsPanel({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white ${
        compact ? 'rounded-xl p-5' : 'rounded-none lg:rounded-l-2xl p-8 lg:p-10 h-full flex flex-col justify-between min-h-[200px] lg:min-h-0'
      }`}
    >
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/90">MillionFlats × Meta-dology</p>
        <h3 className={`mt-2 font-extrabold tracking-tight ${compact ? 'text-lg' : 'text-2xl'}`}>
          Premium 3D experiences that convert buyers
        </h3>
        {!compact ? (
          <p className="mt-3 text-sm text-slate-300/90 leading-relaxed max-w-xs">
            Complete this short wizard — our team will prepare pricing and a tailored demo for your project.
          </p>
        ) : null}
        <ul className={`mt-5 space-y-2.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-slate-200">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function ThreeDTourInquiryWizard({ variant = 'page', onSuccess, onCancel }: Props) {
  const router = useRouter()
  const isPage = variant === 'page'
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [referralPartnerId, setReferralPartnerId] = useState('')
  const [form, setForm] = useState<WizardFormState>(initialForm)

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const persistDraft = useCallback(
    (nextStep: number, nextForm: WizardFormState) => {
      if (typeof window === 'undefined') return
      const payload = { step: nextStep, form: nextForm, savedAt: new Date().toISOString() }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
      void fetch('/api/3d-tour-inquiry/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ step: nextStep, form: nextForm }),
      }).catch(() => null)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const qs = params.toString()
        const res = await fetch(`/api/3d-tour-inquiry${qs ? `?${qs}` : ''}`, { credentials: 'include' })
        const json = (await res.json()) as {
          success?: boolean
          profile?: Profile
          referralCode?: string | null
          referralPartnerId?: string | null
        }
        if (!res.ok || !json.success || !json.profile) {
          if (!cancelled) setError('Could not load your profile. Please refresh and try again.')
          return
        }
        if (cancelled) return
        const p = json.profile
        let merged = {
          ...initialForm,
          name: p.name || '',
          email: p.email || '',
          phone: p.phone || '',
          city: p.city || '',
          countryCode: (p.countryCode === 'UAE' ? 'UAE' : 'INDIA') as 'INDIA' | 'UAE',
        }

        try {
          const localRaw = localStorage.getItem(DRAFT_STORAGE_KEY)
          if (localRaw) {
            const local = JSON.parse(localRaw) as { step?: number; form?: WizardFormState }
            if (local.form) merged = { ...merged, ...local.form }
            if (typeof local.step === 'number') setStep(Math.min(local.step, TOTAL_STEPS - 1))
          }
        } catch {
          /* ignore */
        }

        const draftRes = await fetch('/api/3d-tour-inquiry/draft', { credentials: 'include' }).catch(() => null)
        if (draftRes?.ok) {
          const draftJson = (await draftRes.json()) as { draft?: { step?: number; form?: WizardFormState } }
          if (draftJson.draft?.form) {
            merged = { ...merged, ...draftJson.draft.form }
            if (typeof draftJson.draft.step === 'number') {
              setStep(Math.min(draftJson.draft.step, TOTAL_STEPS - 1))
            }
          }
        }

        setForm(merged)
        setReferralCode(json.referralCode || params.get('ref') || params.get('referral') || '')
        setReferralPartnerId(json.referralPartnerId || params.get('partner') || '')
      } catch {
        if (!cancelled) setError('Could not load your profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loading) return
    const t = window.setTimeout(() => persistDraft(step, form), 600)
    return () => window.clearTimeout(t)
  }, [form, step, loading, persistDraft])

  useEffect(() => {
    if (loading) return
    trackThreeDTourEvent(THREE_D_TOUR_EVENTS.STEP_REACHED, { step: step + 1, label: STEPS[step] })
  }, [step, loading])

  const toggleService = (value: string) => {
    setForm((f) => {
      const has = f.serviceRequirements.includes(value)
      return {
        ...f,
        serviceRequirements: has
          ? f.serviceRequirements.filter((v) => v !== value)
          : [...f.serviceRequirements, value],
      }
    })
  }

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.name.trim()) return 'Please enter your name.'
      if (!form.email.trim()) return 'Please enter your email.'
      if (!form.phone.trim()) return 'Please enter your phone number.'
    }
    if (s === 1) {
      if (!form.inquiryType) return 'Please select a property type.'
    }
    if (s === 2) {
      if (form.serviceRequirements.length === 0) return 'Select at least one service.'
    }
    if (s === 3) {
      if (!form.budgetRange) return 'Please select a budget range.'
      if (!form.timeline) return 'Please select a timeline.'
    }
    return null
  }

  const goNext = () => {
    const msg = validateStep(step)
    if (msg) {
      setError(msg)
      return
    }
    setError('')
    setStep((s) => {
      const next = Math.min(s + 1, TOTAL_STEPS - 1)
      persistDraft(next, form)
      return next
    })
  }

  const goBack = () => {
    setError('')
    setStep((s) => {
      const next = Math.max(s - 1, 0)
      persistDraft(next, form)
      return next
    })
  }

  const serviceLabels = useMemo(
    () =>
      form.serviceRequirements.map(
        (v) => SERVICE_REQUIREMENT_OPTIONS.find((o) => o.value === v)?.label || v,
      ),
    [form.serviceRequirements],
  )

  const handleSubmit = async () => {
    setError('')
    for (let s = 0; s < TOTAL_STEPS - 1; s++) {
      const msg = validateStep(s)
      if (msg) {
        setError(msg)
        setStep(s)
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/3d-tour-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          country: form.countryCode,
          city: form.city,
          inquiryType: form.inquiryType,
          propertyName: form.propertyName || undefined,
          projectName: form.projectName || undefined,
          propertyAddress: form.propertyAddress || undefined,
          propertyCity: form.propertyCity || undefined,
          state: form.state || undefined,
          propertyCountry: form.propertyCountry || undefined,
          pinCode: form.pinCode || undefined,
          builtUpArea: form.builtUpArea || undefined,
          areaUnit: form.areaUnit,
          serviceRequirements: form.serviceRequirements,
          projectScope: form.projectScope,
          timeline: form.timeline,
          budgetRange: form.budgetRange,
          additionalNotes: form.additionalNotes || undefined,
          referralCode: referralCode || undefined,
          referralPartnerId: referralPartnerId || undefined,
          landingUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        }),
      })
      const json = (await res.json()) as { success?: boolean; message?: string; leadId?: string }
      if (!res.ok || !json.success) {
        setError(json.message || 'Submission failed. Please try again.')
        return
      }
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      trackThreeDTourEvent(THREE_D_TOUR_EVENTS.SUBMISSION_COMPLETED, { leadId: json.leadId })
      if (isPage && json.leadId) {
        router.push(`/services/3d-tour-demo/success?ref=${encodeURIComponent(json.leadId)}`)
        return
      }
      onSuccess?.(json.leadId)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          Preparing your demo request…
        </div>
      </div>
    )
  }

  const formShell = (
    <div className={`flex flex-col bg-white ${isPage ? '' : 'min-h-0 overflow-visible max-h-[85vh]'}`}>
      {!isPage ? (
        <div className="lg:hidden shrink-0">
          <BenefitsPanel compact />
        </div>
      ) : null}

      <div className="shrink-0 px-5 sm:px-8 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {isPage ? 'Project consultation' : 'Book your 3D Tour demo'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Step {step + 1} of {TOTAL_STEPS} · {STEPS[step]}
            </p>
          </div>
          {!isPage && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-visible px-5 sm:px-8 py-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          ) : null}

          {step === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">We&apos;ll use this to send your quote and schedule your demo.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={WIZARD_LABEL_CLASS}>Full name</label>
                  <input className={WIZARD_INPUT_CLASS} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className={WIZARD_LABEL_CLASS}>Email</label>
                  <input type="email" className={WIZARD_INPUT_CLASS} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className={WIZARD_LABEL_CLASS}>Phone</label>
                  <input className={WIZARD_INPUT_CLASS} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <WizardSelect
                  label="Country"
                  value={form.countryCode}
                  onChange={(v) => setForm({ ...form, countryCode: v as 'INDIA' | 'UAE' })}
                  options={[
                    { value: 'INDIA', label: '🇮🇳 India' },
                    { value: 'UAE', label: '🇦🇪 UAE' },
                  ]}
                />
                <div>
                  <label className={WIZARD_LABEL_CLASS}>City</label>
                  <input className={WIZARD_INPUT_CLASS} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <WizardSelect
                label="Property type"
                value={form.inquiryType}
                onChange={(v) => setForm({ ...form, inquiryType: v })}
                options={INQUIRY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select property type"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={WIZARD_LABEL_CLASS}>Property name</label>
                  <input className={WIZARD_INPUT_CLASS} value={form.propertyName} onChange={(e) => setForm({ ...form, propertyName: e.target.value })} />
                </div>
                <div>
                  <label className={WIZARD_LABEL_CLASS}>Project name</label>
                  <input className={WIZARD_INPUT_CLASS} value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={WIZARD_LABEL_CLASS}>Address</label>
                  <input className={WIZARD_INPUT_CLASS} value={form.propertyAddress} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })} />
                </div>
                <div>
                  <label className={WIZARD_LABEL_CLASS}>City</label>
                  <input className={WIZARD_INPUT_CLASS} value={form.propertyCity} onChange={(e) => setForm({ ...form, propertyCity: e.target.value })} />
                </div>
                <div>
                  <label className={WIZARD_LABEL_CLASS}>State</label>
                  <input className={WIZARD_INPUT_CLASS} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div>
                  <label className={WIZARD_LABEL_CLASS}>Built-up area</label>
                  <input className={WIZARD_INPUT_CLASS} value={form.builtUpArea} onChange={(e) => setForm({ ...form, builtUpArea: e.target.value })} placeholder="e.g. 2500" />
                </div>
                <WizardSelect
                  label="Unit"
                  value={form.areaUnit}
                  onChange={(v) => setForm({ ...form, areaUnit: v })}
                  options={AREA_UNIT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Select the services you need — tap to toggle.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SERVICE_REQUIREMENT_OPTIONS.map((opt) => {
                  const selected = form.serviceRequirements.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleService(opt.value)}
                      className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                        selected
                          ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {selected ? (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white text-[10px]">
                          ✓
                        </span>
                      ) : null}
                      <span className="text-xl">{SERVICE_ICONS[opt.value] || '◆'}</span>
                      <span className="mt-1.5 block text-xs font-bold text-slate-800 leading-tight">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <WizardSelect
                label="Project scope"
                value={form.projectScope}
                onChange={(v) => setForm({ ...form, projectScope: v })}
                options={PROJECT_SCOPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <WizardSelect
                  label="Timeline"
                  value={form.timeline}
                  onChange={(v) => setForm({ ...form, timeline: v })}
                  options={TIMELINE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
                <WizardSelect
                  label="Budget range"
                  value={form.budgetRange}
                  onChange={(v) => setForm({ ...form, budgetRange: v })}
                  options={BUDGET_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </div>
              <div>
                <label className={WIZARD_LABEL_CLASS}>Additional notes</label>
                <textarea
                  className={`${WIZARD_INPUT_CLASS} min-h-[100px] resize-none py-2.5`}
                  value={form.additionalNotes}
                  onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                  placeholder="Describe your requirements, launch dates, or special requests"
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Review your details before we create your inquiry.</p>
              <dl className="space-y-3 text-sm">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your information</dt>
                  <dd className="mt-2 text-slate-800">
                    {form.name} · {form.email} · {form.phone}
                    <br />
                    {form.city ? `${form.city}, ` : ''}
                    {form.countryCode === 'UAE' ? 'UAE' : 'India'}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Property</dt>
                  <dd className="mt-2 text-slate-800">
                    {inquiryTypeLabel(form.inquiryType)}
                    {form.propertyName ? ` · ${form.propertyName}` : ''}
                    {form.projectName ? ` · ${form.projectName}` : ''}
                    {form.builtUpArea ? (
                      <>
                        <br />
                        {form.builtUpArea}{' '}
                        {AREA_UNIT_OPTIONS.find((u) => u.value === form.areaUnit)?.label || form.areaUnit}
                      </>
                    ) : null}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Services</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {serviceLabels.map((l) => (
                      <span key={l} className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {l}
                      </span>
                    ))}
                  </dd>
                  <dd className="mt-2 text-xs text-slate-600">
                    {budgetRangeLabel(form.budgetRange)} · {timelineLabel(form.timeline)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

      <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-8 py-4 border-t border-slate-100 bg-white">
        <button
          type="button"
          onClick={step === 0 && onCancel ? onCancel : goBack}
          className="h-11 px-5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {step === 0 ? (isPage ? '← Back to 3D Tours' : 'Cancel') : '← Back'}
        </button>
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="h-11 px-8 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-11 px-8 rounded-xl bg-gradient-to-r from-[#0f172a] to-slate-800 text-white text-sm font-bold disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit demo request'}
            </button>
          )}
        </div>
      </div>
  )

  if (isPage) {
    return formShell
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,340px)_1fr] max-h-[85vh] overflow-visible">
      <div className="hidden lg:block min-h-0">
        <BenefitsPanel />
      </div>
      {formShell}
    </div>
  )
}
