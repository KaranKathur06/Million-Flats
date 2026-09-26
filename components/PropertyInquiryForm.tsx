'use client'

import { FormEvent, useState } from 'react'
import { useCurrency } from '@/components/CurrencyProvider'

function Field({ label, name, type = 'text', required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-dark-blue">
      {label}{required ? ' *' : ''}
      <input name={name} type={type} required={required} className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/10" />
    </label>
  )
}

export default function PropertyInquiryForm({
  property,
  whatsappHref,
  onClose,
}: {
  property: { id: string; title: string; location: string; priceLabel: string; propertyType: string; bedrooms: number }
  whatsappHref?: string
  onClose?: () => void
}) {
  const { currency } = useCurrency()
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('submitting')
    setMessage('')
    const form = new FormData(event.currentTarget)
    const payload = {
      propertyId: property.id,
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || '') || null,
      city: String(form.get('city') || '') || null,
      inquiryType: String(form.get('inquiryType') || 'PROPERTY_INQUIRY'),
      preferredContactMethod: String(form.get('preferredContactMethod') || '') || null,
      preferredContactTime: String(form.get('preferredContactTime') || '') || null,
      purchaseTimeline: String(form.get('purchaseTimeline') || '') || null,
      message: String(form.get('message') || '') || null,
      displayCurrency: currency,
      sourceUrl: window.location.href,
      referrer: document.referrer || null,
      website: String(form.get('website') || ''),
    }

    try {
      const response = await fetch('/api/leads/property-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to submit inquiry')
      setState('success')
      setMessage(result.duplicate ? 'Your inquiry has already been received.' : 'A MillionFlats representative will contact you shortly.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Unable to submit inquiry right now.')
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Inquiry submitted</p>
        <h3 className="mt-2 text-xl font-bold text-dark-blue">Thank you for your interest.</h3>
        <p className="mt-2 text-sm text-gray-700">{message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg bg-[#25D366] px-4 text-sm font-semibold text-white">Continue on WhatsApp</a> : null}
          {onClose ? <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-dark-blue">View Property</button> : null}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Property inquiry</p>
          <h3 className="mt-1 text-xl font-bold text-dark-blue">Interested in this property?</h3>
          <p className="mt-2 text-sm text-gray-600">{property.title}</p>
          <p className="text-xs text-gray-500">{property.location} · {property.propertyType} · {property.bedrooms || '-'} BHK · {property.priceLabel}</p>
        </div>
        {onClose ? <button type="button" onClick={onClose} aria-label="Close inquiry form" className="text-2xl leading-none text-gray-400 hover:text-dark-blue">×</button> : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone" name="phone" type="tel" required />
        <Field label="City" name="city" />
        <label className="block text-sm font-medium text-dark-blue">Inquiry type<select name="inquiryType" className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"><option value="PROPERTY_INQUIRY">Property inquiry</option><option value="SITE_VISIT_REQUEST">Request a site visit</option><option value="CALL_BACK">Request a callback</option></select></label>
        <label className="block text-sm font-medium text-dark-blue">Preferred contact method<select name="preferredContactMethod" className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"><option value="PHONE">Phone</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option></select></label>
        <label className="block text-sm font-medium text-dark-blue">Preferred contact time<select name="preferredContactTime" className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"><option value="ANYTIME">Anytime</option><option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option></select></label>
        <label className="block text-sm font-medium text-dark-blue">Purchase timeline<select name="purchaseTimeline" className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"><option value="">Select timeline</option><option value="IMMEDIATE">Immediately</option><option value="THREE_MONTHS">Within 3 months</option><option value="SIX_MONTHS">Within 6 months</option><option value="EXPLORING">Just exploring</option></select></label>
      </div>
      <label className="mt-4 block text-sm font-medium text-dark-blue">Message<textarea name="message" rows={3} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-dark-blue" placeholder="Tell us what you are looking for (optional)" /></label>
      <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-px w-px" aria-hidden="true" />
      {state === 'error' ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
      <button type="submit" disabled={state === 'submitting'} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-dark-blue text-sm font-semibold text-white transition hover:bg-dark-blue/90 disabled:cursor-wait disabled:opacity-60">{state === 'submitting' ? 'Submitting...' : 'Submit Inquiry'}</button>
    </form>
  )
}
