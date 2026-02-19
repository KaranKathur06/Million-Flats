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
    <div className="rounded-3xl border border-gray-200 bg-white p-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">{title}</h1>
        <p className="mt-3 text-gray-600">{description}</p>

        <div className="mt-8 space-y-8">
          {successId ? (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
              <div className="text-sm font-semibold text-green-200">Application submitted</div>
              <div className="mt-1 text-sm text-white/80">Reference ID: {successId}</div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
              <div className="text-sm font-semibold text-red-200">Submission failed</div>
              <div className="mt-1 text-sm text-white/80">{error}</div>
            </div>
          ) : null}

          {groups.map((g) => (
            <div key={g.title} className="rounded-2xl border border-gray-200 p-6">
              <div className="text-lg font-semibold text-gray-900">{g.title}</div>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {g.fields.map((f) => {
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
                          className="mt-2 w-full min-h-[120px] rounded-xl border border-gray-200 px-4 py-3"
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
                          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
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
                                  setField(
                                    key,
                                    on ? selected.filter((x) => x !== o) : [...selected, o]
                                  )
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
                    return (
                      <label key={key} className="md:col-span-2 text-sm">
                        <div className="font-semibold text-gray-900">
                          {f.label}
                          {f.required ? <span className="text-red-600"> *</span> : null}
                        </div>
                        {f.help ? <div className="mt-1 text-xs text-gray-600">{f.help}</div> : null}
                        <input
                          {...common}
                          type="file"
                          accept={f.accept}
                          onChange={(e) => setField(key, e.target.files?.[0] ?? null)}
                          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
                        />
                      </label>
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
                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="text-sm font-semibold text-gray-900">Post-Submission & Next Steps</div>
            <p className="mt-1 text-sm text-gray-600">
              Thank you for your interest! Our partnership team will review your application and contact you within 3-5
              business days. Next steps typically include: review, introductory call, agreement, and onboarding.
            </p>
          </div>

          <button
            type="button"
            disabled={!isComplete || busy}
            onClick={submit}
            className={
              isComplete && !busy
                ? 'inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90'
                : 'inline-flex h-11 items-center justify-center rounded-xl bg-gray-200 px-6 font-semibold text-gray-500 cursor-not-allowed'
            }
          >
            {busy ? 'Submitting…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
