'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const MIN_BIO_LENGTH = 150

  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [image, setImage] = useState(initialImage)
  const [company, setCompany] = useState(initialCompany)
  const [license, setLicense] = useState(initialLicense)
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp)
  const [bio, setBio] = useState(initialBio)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [signedImageUrl, setSignedImageUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bioTouched, setBioTouched] = useState(false)

  const router = useRouter()

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

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('')
      return
    }

    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  useEffect(() => {
    const raw = String(image || '').trim()
    const isS3 = raw.includes('.amazonaws.com/') || raw.includes('s3.')
    if (!raw || !isS3) {
      setSignedImageUrl('')
      return
    }

    let cancelled = false

    fetch('/api/media/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: raw, expiresInSeconds: 900 }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j?.success && typeof j?.url === 'string' && j.url.trim()) {
          setSignedImageUrl(String(j.url))
        } else {
          setSignedImageUrl('')
        }
      })
      .catch(() => {
        if (cancelled) return
        setSignedImageUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [image])

  const uploadPhoto = async () => {
    if (!selectedFile || uploading) return
    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const form = new FormData()
      form.append('file', selectedFile)

      const res = await fetch('/api/agent/upload-photo', {
        method: 'POST',
        body: form,
      })

      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) {
        setError(String(json?.message || 'Failed to upload photo'))
        return
      }

      const url = String(json?.url || '').trim()
      if (!url) {
        setError('Upload succeeded but URL is missing.')
        return
      }

      setImage(url)
      setSelectedFile(null)
      router.refresh()
      setSuccess('Profile photo uploaded.')
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const nextBio = String(bio || '').trim()
      const res = await fetch('/api/agent/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, company, license, whatsapp, bio: nextBio }),
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Agent</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">Agent Profile</h1>
              <p className="mt-2 text-gray-600">Manage your public-facing and contact information.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ProfileStatusBadge status={profileStatus} />
              </div>
            </div>
            <Link
              href="/agent/dashboard"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold shadow-sm hover:bg-gray-50"
            >
              Go to Dashboard
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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

            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-dark-blue">Account</h2>
                  <p className="mt-1 text-sm text-gray-600">Your identity and contact details shown to clients.</p>
                </div>
              </div>

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
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile photo</label>

                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                      {previewUrl || signedImageUrl || image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl || signedImageUrl || image}
                          alt="Profile"
                          className="h-16 w-16 object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-gray-600">No photo</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files && e.target.files[0] ? e.target.files[0] : null
                          setSelectedFile(f)
                        }}
                        className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-xl file:border-0 file:bg-dark-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-dark-blue/90"
                      />

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={uploadPhoto}
                          disabled={!selectedFile || uploading}
                          className="h-10 px-4 rounded-xl bg-dark-blue text-white font-semibold shadow-sm hover:bg-dark-blue/90 disabled:opacity-50"
                        >
                          {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                        <p className="text-xs text-gray-500">JPG/PNG/WebP up to 5MB.</p>
                      </div>
                    </div>
                  </div>
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
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
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
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="WhatsApp number"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-dark-blue">About</h2>
                <p className="mt-1 text-sm text-gray-600">This description appears on your public agent profile.</p>
              </div>

              <div className="mt-5">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                {(() => {
                  const len = String(bio || '').trim().length
                  const tooShort = bioTouched && len > 0 && len < MIN_BIO_LENGTH
                  const neutral = !bioTouched || len === 0 || len >= MIN_BIO_LENGTH
                  return (
                    <>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={5}
                        value={bio}
                        onChange={(e) => {
                          if (!bioTouched) setBioTouched(true)
                          setBio(e.target.value)
                        }}
                        onBlur={() => setBioTouched(true)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all ${
                          tooShort ? 'border-red-400' : 'border-gray-300'
                        }`}
                        placeholder="Write a short introduction for your public profile"
                      />
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className={`text-xs ${tooShort ? 'text-red-600' : 'text-gray-500'}`}>
                          Minimum {MIN_BIO_LENGTH} characters.
                        </p>
                        <p className={`text-xs tabular-nums ${neutral ? 'text-gray-500' : 'text-red-600'}`}>
                          {len} / {MIN_BIO_LENGTH}
                        </p>
                      </div>
                      {tooShort ? (
                        <p className="mt-2 text-sm text-red-600">
                          Bio must be at least {MIN_BIO_LENGTH} characters.
                        </p>
                      ) : null}
                    </>
                  )
                })()}
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
