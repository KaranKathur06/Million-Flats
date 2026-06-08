'use client'

import { useState } from 'react'
import type { PartnerProfileData } from './types'

type PartnerCTAProps = {
  partner: PartnerProfileData
}

export default function PartnerCTA({ partner }: PartnerCTAProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    propertyType: '',
    budget: '',
    requirement: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Name, email, and phone are required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(
        `/api/partners/${partner.categorySlug}/${partner.slug}/inquiry`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
      } else {
        setError(data.message || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="partner-contact" className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-dark-blue via-dark-blue to-primary-900 p-6 text-white shadow-xl sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Request a Consultation with {partner.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                Submit your requirements through MillionFlats. Our team will review and connect you with the right specialist — no direct contact details shared publicly.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-white/70">
                <li className="flex items-center gap-3">
                  <span className="text-accent-yellow">✓</span> Verified partner network
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent-yellow">✓</span> Transparent lead routing via MillionFlats CRM
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent-yellow">✓</span> Response within 24 hours
                </li>
              </ul>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Consultation Request Submitted</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Our team will review your request and follow up shortly regarding {partner.name}.
                </p>
              </div>
            ) : (
              <form className="rounded-xl bg-white p-5 text-gray-800 sm:p-6" onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Full Name *"
                    required
                    className="h-11 rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/20"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone *"
                    required
                    className="h-11 rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/20"
                  />
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email *"
                  required
                  className="mt-3 h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/20"
                />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="h-11 rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-dark-blue"
                  />
                  <select
                    name="propertyType"
                    value={form.propertyType}
                    onChange={handleChange}
                    className="h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-600 outline-none focus:border-dark-blue bg-white"
                  >
                    <option value="">Property Type</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Office">Office</option>
                  </select>
                </div>
                <select
                  name="budget"
                  value={form.budget}
                  onChange={handleChange}
                  className="mt-3 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-600 outline-none focus:border-dark-blue bg-white"
                >
                  <option value="">Budget Range</option>
                  <option value="₹5L - ₹15L">₹5L - ₹15L</option>
                  <option value="₹15L - ₹50L">₹15L - ₹50L</option>
                  <option value="₹50L - ₹1Cr">₹50L - ₹1Cr</option>
                  <option value="₹1Cr+">₹1Cr+ (Luxury)</option>
                </select>
                <input
                  type="text"
                  name="requirement"
                  value={form.requirement}
                  onChange={handleChange}
                  placeholder="Requirement (e.g. Full home interiors)"
                  className="mt-3 h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm outline-none focus:border-dark-blue"
                />
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Additional details (optional)"
                  rows={3}
                  className="mt-3 w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-dark-blue"
                />
                {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-dark-blue text-sm font-semibold text-white hover:bg-dark-blue/90 disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Request Consultation'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
