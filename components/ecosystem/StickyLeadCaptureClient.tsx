'use client'

import { useMemo, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

type LeadPayload = {
  categorySlug: string
  partnerId?: string | null
  name: string
  email: string
  phone: string
  message: string
  source?: string
}

export default function StickyLeadCaptureClient({
  categorySlug,
  defaultMessage,
}: {
  categorySlug: string
  defaultMessage: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const initial = useMemo(
    () => ({ name: '', email: '', phone: '', message: defaultMessage }),
    [defaultMessage]
  )

  const [form, setForm] = useState(initial)

  async function submit() {
    if (busy) return
    setBusy(true)
    setError('')

    try {
      const payload: LeadPayload = {
        categorySlug,
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        source: 'ecosystem_sticky_cta',
      }

      trackEvent('ecosystem_lead_submit', { categorySlug })

      const res = await fetch('/api/ecosystem-partners/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) throw new Error(String(json?.message || 'Submission failed'))

      setSuccess(true)
      setOpen(false)
      setForm(initial)
      trackEvent('ecosystem_lead_success', { categorySlug })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Submission failed'
      setError(msg)
      trackEvent('ecosystem_lead_error', { categorySlug, message: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="hidden lg:block fixed right-6 top-1/2 -translate-y-1/2 z-40">
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setSuccess(false)
            trackEvent('ecosystem_sticky_open', { categorySlug })
          }}
          className="rounded-2xl bg-dark-blue text-white px-5 py-4 shadow-lg hover:bg-dark-blue/90"
        >
          <div className="text-sm font-semibold">Get Free Consultation</div>
          <div className="text-xs text-white/80 mt-1">Request Callback</div>
        </button>
      </div>

      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setOpen(true)
              setSuccess(false)
              trackEvent('ecosystem_sticky_open', { categorySlug, device: 'mobile' })
            }}
            className="w-full h-11 rounded-xl bg-dark-blue text-white font-semibold"
          >
            Talk to Expert
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full lg:max-w-lg bg-white rounded-t-3xl lg:rounded-3xl border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-dark-blue">Request a Callback</div>
                <div className="mt-1 text-sm text-gray-600">Share your details and we’ll connect you with partners.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-gray-600 hover:text-dark-blue">
                Close
              </button>
            </div>

            {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
            {success ? (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Submitted successfully. We’ll reach out shortly.
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                className="h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-blue/20"
              />
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email"
                type="email"
                className="h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-blue/20"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Phone"
                type="tel"
                className="h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-blue/20"
              />
              <textarea
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Message"
                rows={4}
                className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-blue/20"
              />
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="mt-5 w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 disabled:opacity-60"
            >
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      ) : null}

      <div id="lead" className="scroll-mt-24" />
    </>
  )
}
