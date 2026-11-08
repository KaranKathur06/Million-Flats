'use client'

import { useRef, useState } from 'react'
import type { PartnerProfileData } from './types'

type PartnerCTAProps = {
  partner: PartnerProfileData
}

export default function PartnerCTA({ partner }: PartnerCTAProps) {
  const idempotencyKey = useRef<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    propertyType: '',
    budget: '',
    requirement: '',
    message: '',
    consentToShare: false,
    websiteConfirm: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    idempotencyKey.current = null
    setError('')
  }

  const selectService = (serviceName: string) => {
    setForm((previous) => ({ ...previous, requirement: serviceName }))
    idempotencyKey.current = null
    setError('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.message.trim()) {
      setError('Name, email, phone, and a message are required.')
      return
    }
    if (!form.consentToShare) {
      setError('Consent is required to share your inquiry with this partner.')
      return
    }

    setSubmitting(true)
    setError('')
    const requestKey = idempotencyKey.current || crypto.randomUUID()
    idempotencyKey.current = requestKey

    try {
      const response = await fetch(
        `/api/partners/${partner.categorySlug}/${partner.slug}/inquiry`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': requestKey,
          },
          body: JSON.stringify(form),
        }
      )
      const data = await response.json()
      if (response.ok && data.success) {
        setSubmitted(true)
      } else {
        setError(data.error?.message || 'Unable to submit your request. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="partner-contact" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#1e3a5f] px-5 py-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#fbbf24]">
            MillionFlats partner desk
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug">
            Request a consultation
          </h2>
          <p className="mt-1 text-sm leading-5 text-white/75">
            Tell us what you need from {partner.name}. Your request will be routed through MillionFlats.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-3 font-bold text-[#1e3a5f]">Request submitted</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your consultation request for {partner.name} has been received.
            </p>
          </div>
        ) : (
          <form className="space-y-3 p-4 sm:p-5" onSubmit={handleSubmit} noValidate>
            <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden">
              <label htmlFor="partner-inquiry-website-confirm">Leave this field empty</label>
              <input
                id="partner-inquiry-website-confirm"
                type="text"
                name="websiteConfirm"
                value={form.websiteConfirm}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="partner-inquiry-name" className="mb-1 block text-xs font-semibold text-slate-700">
                Full name <span className="text-rose-600">*</span>
              </label>
              <input
                id="partner-inquiry-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/15"
              />
            </div>

            <div>
              <label htmlFor="partner-inquiry-email" className="mb-1 block text-xs font-semibold text-slate-700">
                Email
              </label>
              <input
                id="partner-inquiry-email"
                type="email"
                name="email"
                value={form.email}
                autoComplete="email"
                required
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600"
              />
            </div>

            <div>
              <label htmlFor="partner-inquiry-phone" className="mb-1 block text-xs font-semibold text-slate-700">
                Phone <span className="text-rose-600">*</span>
              </label>
              <input
                id="partner-inquiry-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/15"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label htmlFor="partner-inquiry-city" className="mb-1 block text-xs font-semibold text-slate-700">
                  City
                </label>
                <input
                  id="partner-inquiry-city"
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  autoComplete="address-level2"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/15"
                />
              </div>
              <div>
                <label htmlFor="partner-inquiry-context" className="mb-1 block text-xs font-semibold text-slate-700">
                  Property or service context
                </label>
                <input
                  id="partner-inquiry-context"
                  type="text"
                  name="propertyType"
                  value={form.propertyType}
                  onChange={handleChange}
                  maxLength={80}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="partner-inquiry-budget" className="mb-1 block text-xs font-semibold text-slate-700">
                Budget or project range <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="partner-inquiry-budget"
                type="text"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                maxLength={100}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/15"
              />
            </div>

            <div>
              {partner.services.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold text-slate-700">
                    Choose a listed service to start
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {partner.services.slice(0, 6).map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        aria-pressed={form.requirement === service.name}
                        onClick={() => selectService(service.name)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus-visible:ring-offset-1 ${
                          form.requirement === service.name
                            ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-[#1e3a5f]/40'
                        }`}
                      >
                        {service.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    Selection is included with your consultation request, not a price quote.
                  </p>
                </div>
              )}
              <label htmlFor="partner-inquiry-requirement" className="mb-1 block text-xs font-semibold text-slate-700">
                Service of interest
              </label>
              <input
                id="partner-inquiry-requirement"
                type="text"
                name="requirement"
                value={form.requirement}
                onChange={handleChange}
                maxLength={500}
                placeholder={`For example, ${partner.categoryTitle.toLowerCase()} support`}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/15"
              />
            </div>

            <div>
              <label htmlFor="partner-inquiry-message" className="mb-1 block text-xs font-semibold text-slate-700">
                How can the partner help? <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="partner-inquiry-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={4}
                maxLength={5000}
                required
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/15"
              />
            </div>

            <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
              <input
                type="checkbox"
                checked={form.consentToShare}
                onChange={(event) => {
                  setForm((previous) => ({ ...previous, consentToShare: event.target.checked }))
                  idempotencyKey.current = null
                  setError('')
                }}
                required
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
              />
              <span>
                I agree to be contacted by MillionFlats about this inquiry. If I request a specific partner or MillionFlats matches me with one, I consent to sharing the details provided with that partner for this purpose.
              </span>
            </label>

            {error && (
              <p role="alert" className="text-xs font-medium text-rose-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17304f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Request consultation'}
            </button>
            <p className="text-center text-[11px] leading-5 text-slate-500">
              Your request is protected by MillionFlats&apos; consent-based inquiry process.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
