'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function UserProfileClient({
  initialName,
  email,
  initialPhone,
}: {
  initialName: string
  email: string
  initialPhone: string
}) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.message || 'Failed to update profile')
        return
      }

      setSuccess('Profile updated successfully.')
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Account</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">My Profile</h1>
              <p className="mt-2 text-gray-600">Manage your personal details.</p>
            </div>
            <Link
              href="/user/dashboard"
              className="hidden sm:inline-flex items-center justify-center h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
            >
              Back to Dashboard
            </Link>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            {(error || success) && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  error
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}
              >
                {error || success}
              </div>
            )}

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Personal Info</h2>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    disabled
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="+971 XX XXX XXXX"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </section>
          </form>
        </div>
      </div>
    </div>
  )
}
