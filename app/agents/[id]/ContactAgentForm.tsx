'use client'

import { useState } from 'react'

type Props = {
  agentName: string
  agentId: string
}

export default function ContactAgentForm({ agentName, agentId }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: 'property',
          message: `[Agent: ${agentName} | ${agentId}] ${formData.message}`,
        }),
      })

      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null

      if (!res.ok) {
        setError(data?.message || 'Failed to submit. Please try again.')
        return
      }

      setSubmitted(true)
      setFormData({ name: '', email: '', phone: '', message: '' })
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="font-semibold text-green-800">Message sent</p>
        <p className="mt-1 text-sm text-green-700">The agent or our team will get back to you shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((v) => ({ ...v, name: e.target.value }))}
            className="w-full h-11 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData((v) => ({ ...v, email: e.target.value }))}
            className="w-full h-11 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
            placeholder="you@email.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 mb-1">
          Phone (optional)
        </label>
        <input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData((v) => ({ ...v, phone: e.target.value }))}
          className="w-full h-11 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
          placeholder="+971 …"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-semibold text-gray-700 mb-1">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData((v) => ({ ...v, message: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dark-blue focus:border-dark-blue resize-none"
          placeholder="Tell the agent what you’re looking for…"
        />
      </div>

      <p className="text-xs text-gray-500">
        By submitting, you agree that MillionFlats may share your details with this agent to follow up.
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  )
}
