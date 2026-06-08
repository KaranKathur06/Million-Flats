'use client'

import { useState } from 'react'
import type { DeveloperProfileData } from './types'

type DeveloperCTAProps = {
  developer: DeveloperProfileData
}

export default function DeveloperCTA({ developer }: DeveloperCTAProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'UAE',
    interestedProject: '',
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
    if (!form.name || !form.email) {
      setError('Name and email are required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/developers/${developer.slug}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          country: form.country,
          interestedProject: form.interestedProject || undefined,
          message: form.message || undefined,
        }),
      })

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
    <section id="developer-contact" className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-primary-700 via-primary-700 to-primary-800 p-6 text-white shadow-xl shadow-primary-900/20 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
            {/* Left: Info */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Interested in {developer.name} Projects?
              </h2>
              <p className="mt-3 text-sm text-white/80 sm:text-base leading-relaxed">
                Connect with our team for inventory details, pricing, payment plans, and latest launch updates from {developer.name}.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <svg className="h-5 w-5 text-primary-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Get instant project availability updates
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <svg className="h-5 w-5 text-primary-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Exclusive payment plan options
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <svg className="h-5 w-5 text-primary-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Free consultation with investment experts
                </div>
              </div>
            </div>

            {/* Right: Form */}
            {submitted ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mb-4">
                  <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Inquiry Submitted!</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Our team will contact you within 24 hours with {developer.name} project details.
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
                    className="h-11 rounded-xl border border-gray-200 px-3.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    className="h-11 rounded-xl border border-gray-200 px-3.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email Address *"
                  required
                  className="mt-3 h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-600 outline-none transition focus:border-primary-500 bg-white"
                  >
                    <option value="UAE">🇦🇪 UAE</option>
                    <option value="INDIA">🇮🇳 India</option>
                  </select>
                  {developer.projects.length > 0 && (
                    <select
                      name="interestedProject"
                      value={form.interestedProject}
                      onChange={handleChange}
                      className="h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-600 outline-none transition focus:border-primary-500 bg-white"
                    >
                      <option value="">Interested Project (Optional)</option>
                      {developer.projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Your message (optional)"
                  rows={3}
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
                />

                {error && (
                  <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-dark-blue text-sm font-semibold text-white transition-colors hover:bg-dark-blue/90 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Get Developer Details'
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] text-gray-400">
                  By submitting, you agree to our privacy policy.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
