'use client'

import { useMemo, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

type Field =
  | { type: 'text'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'email'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'tel'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'url'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'number'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'textarea'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'select'; name: string; label: string; options: string[]; required?: boolean }
  | { type: 'multiselect'; name: string; label: string; options: string[]; required?: boolean }
  | { type: 'file'; name: string; label: string; accept?: string; required?: boolean; help?: string }

export default function PartnerRegistrationFormClient({
  title,
  description,
  category,
  groups,
  submitLabel,
  submitUrl,
}: {
  title: string
  description: string
  category: string
  groups: { title: string; fields: Field[] }[]
  submitLabel: string
  submitUrl?: string
}) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [successId, setSuccessId] = useState('')
  const [step, setStep] = useState(0)

  const isComplete = useMemo(() => {
    const requiredFields = groups.flatMap((g) => g.fields.filter((f) => (f as any).required))
    for (const f of requiredFields) {
      const v = values[(f as any).name]
      if (f.type === 'multiselect') {
        if (!Array.isArray(v) || v.length === 0) return false
      } else if (f.type === 'file') {
        if (!v) return false
      } else {
        if (v === undefined || v === null || String(v).trim() === '') return false
      }
    }
    return requiredFields.length > 0
  }, [values, groups])

  const currentGroup = groups[Math.max(0, Math.min(step, groups.length - 1))]

  const isStepComplete = useMemo(() => {
    const g = currentGroup
    if (!g) return false
    const requiredFields = g.fields.filter((f) => (f as any).required)
    for (const f of requiredFields) {
      const v = values[(f as any).name]
      if (f.type === 'multiselect') {
        if (!Array.isArray(v) || v.length === 0) return false
      } else if (f.type === 'file') {
        if (!v) return false
      } else {
        if (v === undefined || v === null || String(v).trim() === '') return false
      }
    }
    return requiredFields.length > 0
  }, [values, currentGroup])

  function setField(name: string, value: any) {
    setValues((p) => ({ ...p, [name]: value }))
  }

  async function submit() {
    if (!isComplete || busy) return
    setBusy(true)
    setError('')
    setSuccessId('')

    try {
      const fd = new FormData()
      fd.set('category', String(category))

      const params = new URLSearchParams(window.location.search)
      fd.set('utm_source', params.get('utm_source') || '')
      fd.set('utm_medium', params.get('utm_medium') || '')
      fd.set('utm_campaign', params.get('utm_campaign') || '')
      fd.set('utm_term', params.get('utm_term') || '')
      fd.set('utm_content', params.get('utm_content') || '')
      fd.set('referrer', document.referrer || '')
      fd.set('landing_url', window.location.href || '')
      fd.set('user_agent', navigator.userAgent || '')

      for (const [k, v] of Object.entries(values)) {
        if (v === undefined || v === null) continue
        if (v instanceof File) {
          continue
        }
        if (Array.isArray(v)) {
          fd.set(k, JSON.stringify(v))
        } else {
          fd.set(k, String(v))
        }
      }

      const fileKeys = Object.keys(values).filter((k) => values[k] instanceof File)
      for (const k of fileKeys) {
        const f = values[k] as File
        const key = String(k).toLowerCase()
        if (key.includes('logo') || key.includes('photo')) {
          fd.set('logo', f)
        } else {
          fd.set('certificate', f)
        }
      }

      trackEvent('ecosystem_partner_form_submit', { category })

      const res = await fetch(submitUrl || '/api/ecosystem-partners/apply', {
        method: 'POST',
        body: fd,
      })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) {
        throw new Error(String(json?.message || 'Submission failed'))
      }

      const id = String(json?.application?.id || json?.partner?.id || '')
      setSuccessId(id)
      trackEvent('ecosystem_partner_form_success', { category, id })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Submission failed'
      setError(msg)
      trackEvent('ecosystem_partner_form_error', { category, message: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">{title}</h1>
          <p className="mt-3 text-gray-600">{description}</p>

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {groups.map((g, i) => {
                const active = i === step
                const done = i < step
                return (
                  <button
                    key={g.title}
                    type="button"
                    onClick={() => {
                      if (busy || successId) return
                      setStep(i)
                    }}
                    className={
                      active
                        ? 'inline-flex h-9 items-center gap-2 rounded-xl border border-dark-blue/20 bg-dark-blue/5 px-3 font-semibold text-dark-blue'
                        : done
                          ? 'inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 font-semibold text-gray-700 hover:bg-gray-50'
                          : 'inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 font-semibold text-gray-500'
                    }
                  >
                    <span
                      className={
                        active
                          ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-dark-blue text-[11px] font-bold text-white'
                          : done
                            ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white'
                            : 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-600'
                      }
                    >
                      {i + 1}
                    </span>
                    <span>{g.title}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-dark-blue transition-all"
                style={{ width: `${((Math.min(step, groups.length - 1) + 1) / Math.max(1, groups.length)) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-8 space-y-6">
          {successId ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="text-sm font-semibold text-green-800">Registration submitted</div>
              <div className="mt-1 text-sm text-green-900">Reference ID: {successId}</div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="text-sm font-semibold text-red-800">Submission failed</div>
              <div className="mt-1 text-sm text-red-900">{error}</div>
            </div>
          ) : null}

          {currentGroup ? (
            <div className="rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{currentGroup.title}</div>
                  <div className="mt-1 text-sm text-gray-600">Step {step + 1} of {groups.length}</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentGroup.fields.map((f) => {
                  const key = (f as any).name
                  const common = {
                    id: key,
                    name: key,
                  }

                  if (f.type === 'textarea') {
                    return (
                      <label key={key} className="md:col-span-2 text-sm">
                        <div className="font-semibold text-gray-900">
                          {f.label}
                          {f.required ? <span className="text-red-600"> *</span> : null}
                        </div>
                        <textarea
                          {...common}
                          value={values[key] ?? ''}
                          onChange={(e) => setField(key, e.target.value)}
                          placeholder={f.placeholder}
                          className="mt-2 w-full min-h-[140px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-dark-blue/40 focus:ring-4 focus:ring-dark-blue/10"
                        />
                      </label>
                    )
                  }

                  if (f.type === 'select') {
                    return (
                      <label key={key} className="text-sm">
                        <div className="font-semibold text-gray-900">
                          {f.label}
                          {f.required ? <span className="text-red-600"> *</span> : null}
                        </div>
                        <select
                          {...common}
                          value={values[key] ?? ''}
                          onChange={(e) => setField(key, e.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-dark-blue/40 focus:ring-4 focus:ring-dark-blue/10"
                        >
                          <option value="">Select</option>
                          {f.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </label>
                    )
                  }

                  if (f.type === 'multiselect') {
                    const selected: string[] = Array.isArray(values[key]) ? values[key] : []
                    return (
                      <div key={key} className="md:col-span-2">
                        <div className="text-sm font-semibold text-gray-900">
                          {f.label}
                          {f.required ? <span className="text-red-600"> *</span> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {f.options.map((o) => {
                            const on = selected.includes(o)
                            return (
                              <button
                                key={o}
                                type="button"
                                onClick={() => {
                                  setField(key, on ? selected.filter((x) => x !== o) : [...selected, o])
                                }}
                                className={
                                  on
                                    ? 'rounded-full bg-dark-blue px-4 py-2 text-xs font-semibold text-white'
                                    : 'rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                                }
                              >
                                {o}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  if (f.type === 'file') {
                    const file = values[key] instanceof File ? (values[key] as File) : null
                    return (
                      <div key={key} className="md:col-span-2">
                        <div className="text-sm font-semibold text-gray-900">
                          {f.label}
                          {f.required ? <span className="text-red-600"> *</span> : null}
                        </div>
                        {f.help ? <div className="mt-1 text-xs text-gray-600">{f.help}</div> : null}

                        <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">{file ? file.name : 'No file selected'}</div>
                              {file ? (
                                <div className="mt-1 text-xs text-gray-600">{Math.max(1, Math.round(file.size / 1024))} KB</div>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-dark-blue px-4 text-sm font-semibold text-white hover:bg-dark-blue/90">
                                Choose file
                                <input
                                  {...common}
                                  type="file"
                                  accept={f.accept}
                                  onChange={(e) => setField(key, e.target.files?.[0] ?? null)}
                                  className="hidden"
                                />
                              </label>
                              {file ? (
                                <button
                                  type="button"
                                  onClick={() => setField(key, null)}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-dark-blue hover:bg-gray-50"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  const inputType = f.type
                  return (
                    <label key={key} className="text-sm">
                      <div className="font-semibold text-gray-900">
                        {f.label}
                        {f.required ? <span className="text-red-600"> *</span> : null}
                      </div>
                      <input
                        {...common}
                        type={inputType}
                        inputMode={inputType === 'number' ? 'numeric' : undefined}
                        value={values[key] ?? ''}
                        onChange={(e) => setField(key, e.target.value)}
                        placeholder={(f as any).placeholder}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-dark-blue/40 focus:ring-4 focus:ring-dark-blue/10"
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}

          {step >= groups.length - 1 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-sm font-semibold text-gray-900">Post-Submission & Next Steps</div>
              <p className="mt-1 text-sm text-gray-600">
                Thank you for your interest! Our partnership team will review your application and contact you within 3-5
                business days. Next steps typically include: review, introductory call, agreement, and onboarding.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (busy || successId) return
                setError('')
                setStep((s) => Math.max(0, s - 1))
              }}
              disabled={step === 0 || busy || Boolean(successId)}
              className={
                step > 0 && !busy && !successId
                  ? 'inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-semibold text-dark-blue hover:bg-gray-50'
                  : 'inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-semibold text-gray-400 cursor-not-allowed'
              }
            >
              Back
            </button>

            {step < groups.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (busy || successId) return
                  if (!isStepComplete) {
                    setError('Please complete all required fields to proceed.')
                    return
                  }
                  setError('')
                  setStep((s) => Math.min(groups.length - 1, s + 1))
                }}
                disabled={busy || Boolean(successId)}
                className={
                  !busy && !successId
                    ? 'inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90'
                    : 'inline-flex h-11 items-center justify-center rounded-xl bg-gray-200 px-6 font-semibold text-gray-500 cursor-not-allowed'
                }
              >
                Proceed
              </button>
            ) : (
              <button
                type="button"
                disabled={!isComplete || busy || Boolean(successId)}
                onClick={submit}
                className={
                  isComplete && !busy && !successId
                    ? 'inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90'
                    : 'inline-flex h-11 items-center justify-center rounded-xl bg-gray-200 px-6 font-semibold text-gray-500 cursor-not-allowed'
                }
              >
                {busy ? 'Submitting…' : submitLabel}
              </button>
            )}
          </div>
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-sm font-semibold text-gray-900">What you’ll get</div>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex gap-2">
                  <span className="mt-[2px] h-2 w-2 rounded-full bg-dark-blue" />
                  <div>Listing in the MillionFlats partner directory after approval</div>
                </div>
                <div className="flex gap-2">
                  <span className="mt-[2px] h-2 w-2 rounded-full bg-dark-blue" />
                  <div>High-intent leads routed to verified partners</div>
                </div>
                <div className="flex gap-2">
                  <span className="mt-[2px] h-2 w-2 rounded-full bg-dark-blue" />
                  <div>Priority placement options after verification</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-sm font-semibold text-gray-900">Review timeline</div>
              <div className="mt-2 text-sm text-gray-600">
                Most applications are reviewed within 3-5 business days.
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-sm font-semibold text-gray-900">Tips for faster approval</div>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex gap-2">
                  <span className="mt-[2px] h-2 w-2 rounded-full bg-gray-400" />
                  <div>Use your official email and active phone number</div>
                </div>
                <div className="flex gap-2">
                  <span className="mt-[2px] h-2 w-2 rounded-full bg-gray-400" />
                  <div>Upload a clear logo (square works best)</div>
                </div>
                <div className="flex gap-2">
                  <span className="mt-[2px] h-2 w-2 rounded-full bg-gray-400" />
                  <div>Provide real service areas and a short, specific description</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
