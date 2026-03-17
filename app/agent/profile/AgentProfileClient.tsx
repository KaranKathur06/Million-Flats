'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAgentLifecycleUx, AgentStatus } from '@/lib/agentLifecycle'
import { ProfileStatusBadge } from '../_components/AgentProfileSubmitPanel'

/* ─── helpers ─────────────────────────────────────── */
const MIN_BIO_LENGTH = 150

type CheckItem = { key: string; label: string; done: boolean }

function CheckRow({ item }: { item: CheckItem }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
        item.done ? 'bg-emerald-100' : 'bg-gray-100/80'
      }`}>
        {item.done ? (
          <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${item.done ? 'text-gray-700' : 'text-gray-500'}`}>{item.label}</span>
    </div>
  )
}

/* ─── TYPES ────────────────────────────────────────── */
export default function AgentProfileClient({
  sessionRole,
  initialName,
  email,
  initialPhone,
  initialImage,
  initialImageUpdatedAt,
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
  initialImageUpdatedAt?: string
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
  const [imageUpdatedAt, setImageUpdatedAt] = useState<string>(initialImageUpdatedAt || '')
  const [company, setCompany] = useState(initialCompany)
  const [license, setLicense] = useState(initialLicense)
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp)
  const [bio, setBio] = useState(initialBio)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bioTouched, setBioTouched] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const lifecycle = useMemo(() => getAgentLifecycleUx({ status: profileStatus as AgentStatus }), [profileStatus])
  const notice = useMemo(() => String(searchParams?.get('notice') || '').trim(), [searchParams])

  const noticeText =
    notice === 'under_review' ? 'Your profile is under review.' :
    notice === 'not_approved' ? 'Your profile is verified and waiting for activation.' :
    notice === 'complete_profile' ? 'Complete your profile and upload documents for verification.' : ''

  const pct = Math.max(0, Math.min(100, Math.round(profileCompletion)))

  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(''); return }
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  const uploadPhoto = async () => {
    if (!selectedFile || uploading) return
    setUploading(true); setError(''); setSuccess('')
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      const res = await fetch('/api/agent/upload-photo', { method: 'POST', body: form })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) { setError(String(json?.message || 'Failed to upload photo')); return }
      const agent = json?.agent
      const url = String(agent?.profileImageUrl || agent?.profilePhoto || '').trim()
      const updatedAt = String(agent?.profileImageUpdatedAt || '').trim()
      if (!url) { setError('Upload succeeded but URL is missing.'); return }
      setImage(url); setImageUpdatedAt(updatedAt || String(Date.now())); setSelectedFile(null); setSuccess('Profile photo updated.')
    } catch { setError('An error occurred. Please try again.') }
    finally { setUploading(false) }
  }

  const dirty = useMemo(() =>
    name !== initialName || phone !== initialPhone || company !== initialCompany ||
    license !== initialLicense || whatsapp !== initialWhatsapp || bio !== initialBio,
    [name, phone, company, license, whatsapp, bio, initialName, initialPhone, initialCompany, initialLicense, initialWhatsapp, initialBio]
  )

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/agent/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, company, license, whatsapp, bio: String(bio || '').trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data?.message || 'Failed to update profile'); return }
      setSuccess('Profile updated successfully.')
    } catch { setError('An error occurred. Please try again.') }
    finally { setLoading(false) }
  }

  /* Profile completion checklist */
  const checks: CheckItem[] = [
    { key: 'name', label: 'Full name added', done: Boolean(name?.trim()) },
    { key: 'phone', label: 'Phone number added', done: Boolean(phone?.trim()) },
    { key: 'photo', label: 'Profile photo uploaded', done: Boolean(image?.trim()) },
    { key: 'bio', label: `Bio (${MIN_BIO_LENGTH}+ chars)`, done: String(bio || '').trim().length >= MIN_BIO_LENGTH },
    { key: 'company', label: 'Company added', done: Boolean(company?.trim()) },
    { key: 'license', label: 'License number added', done: Boolean(license?.trim()) },
  ]
  const completedChecks = checks.filter((c) => c.done).length
  const livePct = Math.round((completedChecks / checks.length) * 100)

  const bioLen = String(bio || '').trim().length
  const bioTooShort = bioTouched && bioLen > 0 && bioLen < MIN_BIO_LENGTH

  /* Status info */
  const statusIsLive = String(profileStatus).toUpperCase() === 'LIVE'
  const statusIsSubmitted = String(profileStatus).toUpperCase() === 'SUBMITTED'
  const statusIsVerified = String(profileStatus).toUpperCase() === 'VERIFIED'

  const initials = useMemo(() => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] || 'A'
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
    return `${first}${last}`.toUpperCase()
  }, [name])

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ─── HEADER ─────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#0c2340] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-300 rounded-full translate-y-1/2 blur-2xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link href="/agent/dashboard" className="text-blue-300 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Dashboard
                </Link>
                <span className="text-blue-400 text-sm">/</span>
                <span className="text-white text-sm font-medium">Profile</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Agent Profile</h1>
              <p className="mt-2 text-blue-200 text-sm">Manage your public-facing information and contact details.</p>
              <div className="mt-3">
                <ProfileStatusBadge status={profileStatus} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/agent/verification"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Upload Documents
              </Link>
              <Link
                href="/agent/dashboard"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-[#1e3a5f] text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── NOTICE ───────────────────────────────────── */}
        {noticeText && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-800 font-medium">{noticeText}</p>
          </div>
        )}

        {/* ─── PROGRESS CARD ────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-[#1e3a5f]">Profile Completion</h2>
                <span className={`text-sm font-bold ${livePct === 100 ? 'text-emerald-600' : livePct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {livePct}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    livePct === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                    livePct >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    'bg-gradient-to-r from-red-400 to-red-500'
                  }`}
                  style={{ width: `${livePct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {livePct === 100 ? 'Profile complete! Proceed to upload your verification documents.' :
                 `${checks.length - completedChecks} item${checks.length - completedChecks !== 1 ? 's' : ''} remaining to complete your profile.`}
              </p>
            </div>
            <div className="sm:border-l sm:border-gray-100 sm:pl-6 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-6 gap-y-2">
                {checks.slice(0, 4).map((c) => <CheckRow key={c.key} item={c} />)}
              </div>
            </div>
          </div>

          {/* Next step CTA if incomplete */}
          {livePct < 100 ? (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">Complete the form below and save changes to boost completion.</p>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">Your profile is complete! Next: upload your verification documents.</p>
              <Link href="/agent/verification" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#1e3a5f]/90 transition-colors whitespace-nowrap">
                Upload Documents
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* ─── MAIN GRID ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT — Identity Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              {/* Status row */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Identity</p>
                  <p className="mt-0.5 text-lg font-bold text-[#1e3a5f] leading-tight">{name || 'Agent'}</p>
                  {company && <p className="text-sm text-gray-500">{company}</p>}
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  dirty ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {dirty ? 'Unsaved' : 'Saved'}
                </span>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-[#1e3a5f] via-blue-400 to-[#f97316] opacity-60 blur-[3px]" />
                  <div className="relative h-32 w-32 rounded-full bg-white p-1.5 shadow-xl">
                    <div className="h-full w-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {previewUrl || image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={imageUpdatedAt || image} src={previewUrl || image} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-[#1e3a5f]/10 to-blue-50">
                          <span className="text-2xl font-bold text-[#1e3a5f]">{initials}</span>
                          <span className="text-[10px] text-gray-400 mt-1">No photo</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-1 right-1 rounded-full bg-white border border-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-600 shadow-sm">
                      {String(profileStatus || '').toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Photo upload area */}
                <div
                  className={`mt-5 w-full rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                    dragActive ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 scale-[1.01]' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                  }`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true) }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true) }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false) }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation(); setDragActive(false)
                    const f = e.dataTransfer?.files?.[0] || null
                    if (f) setSelectedFile(f)
                  }}
                >
                  <svg className="w-6 h-6 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-500 mb-3">Drag &amp; drop or browse</p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#1e3a5f]/90 transition-colors"
                    >
                      Browse Photo
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => { const f = e.target.files && e.target.files[0] ? e.target.files[0] : null; setSelectedFile(f); e.currentTarget.value = '' }}
                    className="sr-only"
                  />
                </div>

                {selectedFile && (
                  <div className="mt-3 w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-500">{Math.max(1, Math.round(selectedFile.size / 1024))} KB</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setSelectedFile(null)} disabled={uploading}
                        className="h-7 px-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                        Cancel
                      </button>
                      <button type="button" onClick={uploadPhoto} disabled={uploading}
                        className="h-7 px-3 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#1e3a5f]/90 disabled:opacity-50">
                        {uploading ? '…' : 'Upload'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-3 text-center text-[10px] text-gray-400">JPG / PNG / WebP — max 5 MB</p>
            </div>

            {/* Completion checks full list */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#1e3a5f] mb-3">Profile Checklist</h3>
              <div className="space-y-2.5">
                {checks.map((c) => <CheckRow key={c.key} item={c} />)}
              </div>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="lg:col-span-8">
            <form onSubmit={onSubmit} className="space-y-5">
              {(error || success) && (
                <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
                  error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  {error ? (
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  )}
                  {error || success}
                </div>
              )}

              {/* Account Details */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1e3a5f]">Account Details</h2>
                    <p className="text-xs text-gray-500">Your identity and contact info shown to clients</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name" name="name" type="text" value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-all text-sm"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      id="email" name="email" type="email" value={email} disabled
                      className="w-full h-11 px-4 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="phone" name="phone" type="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-all text-sm"
                      placeholder="+971 XX XXX XXXX"
                    />
                  </div>

                  <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp</label>
                    <input
                      id="whatsapp" name="whatsapp" type="tel" value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-all text-sm"
                      placeholder="WhatsApp number"
                    />
                  </div>
                </div>
              </section>

              {/* About */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1e3a5f]">About You</h2>
                    <p className="text-xs text-gray-500">This appears on your public agent profile</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Bio <span className="text-red-500">*</span>
                    <span className="ml-1 text-gray-400 font-normal">({MIN_BIO_LENGTH}+ characters)</span>
                  </label>
                  <textarea
                    id="bio" name="bio" rows={5} value={bio}
                    onChange={(e) => { if (!bioTouched) setBioTouched(true); setBio(e.target.value) }}
                    onBlur={() => setBioTouched(true)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-all resize-none text-sm ${
                      bioTooShort ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Write a compelling introduction for your public profile. Share your experience, expertise, and what makes you unique as an agent…"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className={`text-xs ${bioTooShort ? 'text-red-600' : 'text-gray-400'}`}>
                      {bioTooShort ? `${MIN_BIO_LENGTH - bioLen} more characters needed` : 'Tip: A strong profile increases buyer trust and leads.'}
                    </p>
                    <p className={`text-xs tabular-nums font-medium ${
                      bioLen >= MIN_BIO_LENGTH ? 'text-emerald-600' : bioTouched && bioLen > 0 ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      {bioLen} / {MIN_BIO_LENGTH}
                    </p>
                  </div>
                </div>
              </section>

              {/* Professional Details */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1e3a5f]">Professional Details</h2>
                    <p className="text-xs text-gray-500">Required for verification and trust badges</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="company" name="company" type="text" value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-all text-sm"
                      placeholder="Your agency / company"
                    />
                  </div>

                  <div>
                    <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-1.5">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="license" name="license" type="text" value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-all text-sm"
                      placeholder="RERA / BRN number"
                    />
                  </div>
                </div>
              </section>

              {/* Save Button */}
              <div className="flex items-center justify-between gap-4 py-2">
                <p className="text-xs text-gray-400">
                  {dirty ? '● Unsaved changes — save before continuing.' : '✓ All changes saved.'}
                </p>
                <button
                  type="submit" disabled={loading}
                  className={`h-11 px-8 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                    dirty && !loading
                      ? 'bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving…
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ─── NEXT STEP CTA ────────────────────────────── */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-gradient-to-r from-[#1e3a5f] to-[#0c2340] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">Next Step</p>
              <h3 className="text-white text-lg font-bold">Complete your verification to activate your account</h3>
              <p className="text-blue-200 text-sm mt-1">
                Upload your Government ID and Real Estate License to unlock all platform features.
              </p>
            </div>
            <Link
              href="/agent/verification"
              className="flex-shrink-0 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-white text-[#1e3a5f] font-semibold text-sm hover:bg-gray-100 transition-colors"
            >
              Upload Documents
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
