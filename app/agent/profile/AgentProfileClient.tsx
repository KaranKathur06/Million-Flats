'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { getAgentLifecycleUx } from '@/lib/agentLifecycle'
import AgentProfileSubmitPanel, { ProfileStatusBadge } from '../_components/AgentProfileSubmitPanel'

export default function AgentProfileClient({
  sessionRole,
  initialName,
  email,
  initialPhone,
  initialImage,
  initialCompany,
  initialLicense,
  initialWhatsapp,
  initialBio,
  profileStatus,
  profileCompletion,
}: {
  sessionRole: string
  initialName: string
  email: string
  initialPhone: string
  initialImage: string
  initialCompany: string
  initialLicense: string
  initialWhatsapp: string
  initialBio: string
  profileStatus: string
  profileCompletion: number
}) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [image, setImage] = useState(initialImage)
  const [company, setCompany] = useState(initialCompany)
  const [license, setLicense] = useState(initialLicense)
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp)
  const [bio, setBio] = useState(initialBio)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const searchParams = useSearchParams()

  const lifecycle = useMemo(() => getAgentLifecycleUx({ profileStatus }), [profileStatus])
  const notice = useMemo(() => String(searchParams?.get('notice') || '').trim(), [searchParams])

  const noticeText =
    notice === 'under_review'
      ? 'Your profile is under review.'
      : notice === 'not_approved'
        ? 'Your profile is verified and waiting for activation.'
        : notice === 'complete_profile'
          ? 'Complete your profile and submit it for verification.'
          : ''

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/agent/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, image, company, license, whatsapp, bio }),
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
              <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Agent</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">Agent Profile</h1>
              <p className="mt-2 text-gray-600">Manage your public-facing and contact information.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ProfileStatusBadge status={profileStatus} />
              </div>
            </div>
            <Link
              href={getHomeRouteForRole(sessionRole)}
              className="hidden sm:inline-flex items-center justify-center h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
            >
              Back to Portal
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-dark-blue">{lifecycle.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{lifecycle.message}</p>
                {noticeText ? <p className="mt-2 text-sm font-semibold text-gray-700">{noticeText}</p> : null}
              </div>
              <ProfileStatusBadge status={profileStatus} />
            </div>

            {lifecycle.ctaLabel && lifecycle.ctaHref ? (
              <div className="mt-4">
                <Link
                  href={lifecycle.ctaHref}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90"
                >
                  {lifecycle.ctaLabel}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <AgentProfileSubmitPanel
              profileStatus={profileStatus}
              license={license}
              phone={phone}
              bio={bio}
              photo={image}
              profileCompletion={profileCompletion}
            />
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
              <h2 className="text-lg font-semibold text-dark-blue">Account</h2>

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
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                    Profile photo URL
                  </label>
                  <input
                    id="image"
                    name="image"
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="https://…"
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

                <div>
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="WhatsApp number"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">About</h2>

              <div className="mt-5">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                  placeholder="Write a short introduction for your public profile"
                />
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Professional</h2>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-2">
                    License
                  </label>
                  <input
                    id="license"
                    name="license"
                    type="text"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="License number"
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
