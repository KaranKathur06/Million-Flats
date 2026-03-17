'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type AgentDocument = {
  id: string
  type: string
  fileUrl: string
  status: DocumentStatus
  rejectionReason: string | null
}

const REQUIRED_DOCS = [
  {
    type: 'GOVERNMENT_ID',
    label: 'Government ID',
    desc: 'Passport, Emirates ID, or national ID card',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
      </svg>
    ),
  },
  {
    type: 'REAL_ESTATE_LICENSE',
    label: 'Real Estate License',
    desc: 'RERA certificate or equivalent authority license',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
]

const OPTIONAL_DOCS = [
  {
    type: 'SELFIE_VERIFICATION',
    label: 'Selfie with ID',
    desc: 'Photo of yourself holding your Government ID — speeds up review',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    type: 'ADDRESS_PROOF',
    label: 'Address Proof',
    desc: 'Utility bill or bank statement (last 3 months)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
]

function normalizePhone(v: string) {
  return (v || '').replace(/[^0-9+]/g, '').trim()
}

function asProfileStatus(v: unknown) {
  const s = String(v || 'DRAFT').toUpperCase()
  if (['SUBMITTED', 'VERIFIED', 'LIVE', 'SUSPENDED', 'DRAFT'].includes(s)) return s
  return 'DRAFT'
}

export default function AgentVerificationCenter({
  agentName,
  profileStatus,
  agentStatus,
  license,
  bio,
  photo,
  phone,
}: {
  agentName: string
  profileStatus: string
  agentStatus: string
  license: string
  bio: string
  photo: string
  phone: string
}) {
  const router = useRouter()
  const [documents, setDocuments] = useState<AgentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const pStatus = asProfileStatus(profileStatus)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/agent/documents')
      const data = await res.json()
      if (res.ok) setDocuments(data.documents || [])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(docType)
    try {
      const presignedRes = await fetch('/api/media/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'agent-docs' }),
      })
      if (!presignedRes.ok) throw new Error('Failed to get upload URL')
      const { url, fileUrl } = await presignedRes.json()
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      const saveRes = await fetch('/api/agent/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: docType, fileUrl }),
      })
      if (saveRes.ok) await fetchDocuments()
    } catch {
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  // Profile readiness
  const profileRequirements = useMemo(() => {
    const missing: string[] = []
    if (!String(license || '').trim()) missing.push('license')
    if (!normalizePhone(phone) || normalizePhone(phone).length < 8) missing.push('phone')
    if (!String(photo || '').trim()) missing.push('photo')
    if (!String(bio || '').trim() || String(bio).trim().length < 150) missing.push('bio')
    return { missing, ready: missing.length === 0 }
  }, [license, phone, photo, bio])

  const requiredDocsUploaded = REQUIRED_DOCS.every((req) =>
    documents.some((d) => d.type === req.type && (d.status === 'APPROVED' || d.status === 'PENDING'))
  )
  const allRequiredApproved = REQUIRED_DOCS.every((req) =>
    documents.some((d) => d.type === req.type && d.status === 'APPROVED')
  )

  const canSubmit = pStatus === 'DRAFT' && profileRequirements.ready && requiredDocsUploaded
  const alreadySubmitted = pStatus === 'SUBMITTED' || pStatus === 'VERIFIED' || pStatus === 'LIVE'

  const handleSubmit = async () => {
    if (submitting || !canSubmit) return
    setSubmitting(true)
    setSubmitMessage('')
    setSubmitSuccess(false)
    try {
      const res = await fetch('/api/agent/profile/submit', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as any
      if (res.ok && json?.success) {
        setSubmitSuccess(true)
        router.refresh()
        return
      }
      setSubmitMessage(String(json?.message || 'Failed to submit for verification.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Progress steps
  const steps = [
    { key: 'profile', label: 'Profile Complete', done: profileRequirements.ready },
    { key: 'docs', label: 'Documents Uploaded', done: requiredDocsUploaded },
    { key: 'submitted', label: 'Verification Submitted', done: alreadySubmitted },
    { key: 'approved', label: 'Account Approved', done: pStatus === 'LIVE' },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const progress = Math.round((doneCount / steps.length) * 100)

  const getDocForType = (type: string) => documents.find((d) => d.type === type)

  const renderStatusBadge = (status?: DocumentStatus) => {
    if (!status)
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
          Not Uploaded
        </span>
      )
    if (status === 'APPROVED')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Approved
        </span>
      )
    if (status === 'REJECTED')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
          Rejected
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Under Review
      </span>
    )
  }

  const renderDocCard = (
    def: { type: string; label: string; desc: string; icon: React.ReactNode },
    required: boolean
  ) => {
    const doc = getDocForType(def.type)
    const isUploading = uploading === def.type
    const isApproved = doc?.status === 'APPROVED'

    return (
      <div
        key={def.type}
        className={`relative rounded-2xl border p-5 transition-all duration-200 ${
          isApproved
            ? 'border-emerald-200 bg-emerald-50/50'
            : doc
            ? 'border-amber-200 bg-amber-50/30'
            : 'border-gray-200 bg-white hover:border-[#1e3a5f]/30 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
              }`}
            >
              {def.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-[#1e3a5f]">{def.label}</h3>
                {required && (
                  <span className="text-[10px] uppercase font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    Required
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{def.desc}</p>
              {doc?.status === 'REJECTED' && doc.rejectionReason && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">
                  Reason: {doc.rejectionReason}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {renderStatusBadge(doc?.status)}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleUpload(e, def.type)}
                className="sr-only"
                disabled={isUploading || isApproved}
              />
              <div
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isUploading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isApproved
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    : doc
                    ? 'bg-white text-[#1e3a5f] border border-gray-200 hover:bg-gray-50'
                    : 'bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90'
                }`}
              >
                {isUploading ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading…
                  </span>
                ) : isApproved ? (
                  'Approved'
                ) : doc ? (
                  'Replace'
                ) : (
                  'Upload'
                )}
              </div>
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ─── HEADER ─── */}
      <div className="relative bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#0c2340] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-300 rounded-full translate-y-1/2 blur-2xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link
                  href="/agent/dashboard"
                  className="text-blue-300 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Dashboard
                </Link>
                <span className="text-blue-400 text-sm">/</span>
                <span className="text-white text-sm font-medium">Verification</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Verification Center</h1>
              <p className="mt-2 text-blue-200 text-sm max-w-md">
                Upload your professional documents and submit for verification to unlock all platform features.
              </p>
            </div>

            {/* Status pill */}
            <div className="flex-shrink-0">
              {alreadySubmitted ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400/20 border border-amber-300/40 backdrop-blur-sm">
                  <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-amber-200 text-sm font-semibold">Under Review</span>
                </div>
              ) : pStatus === 'LIVE' ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400/20 border border-emerald-300/40 backdrop-blur-sm">
                  <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-emerald-200 text-sm font-semibold">Verified &amp; Active</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                  <svg className="w-4 h-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-blue-200 text-sm font-semibold">Documents Pending</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-200 text-xs font-medium">Verification Progress</span>
              <span className="text-white text-xs font-bold">{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-300 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-4 flex items-center gap-6 flex-wrap">
              {steps.map((step) => (
                <div key={step.key} className="flex items-center gap-1.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done ? 'bg-emerald-400' : 'bg-white/20 border border-white/30'
                    }`}
                  >
                    {step.done && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs ${step.done ? 'text-emerald-300' : 'text-blue-300'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── Left: Document Upload ─── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile prerequisites warning */}
              {!profileRequirements.ready && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-800">Complete Your Profile First</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        You need to complete your profile before submitting for verification.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profileRequirements.missing.map((m) => (
                          <span
                            key={m}
                            className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 capitalize"
                          >
                            Missing: {m}
                          </span>
                        ))}
                      </div>
                      <Link
                        href="/agent/profile"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 hover:text-amber-900"
                      >
                        Complete Profile
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* All required docs approved banner */}
              {allRequiredApproved && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-800">All Required Documents Approved</h3>
                      <p className="text-sm text-emerald-700 mt-1">
                        Your documents have been verified. Ready for final admin review.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Already submitted banner */}
              {alreadySubmitted && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-800">Verification Submitted</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Your profile is under review. This typically takes 24–48 hours. We&apos;ll notify you by email once reviewed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Required Documents */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-base font-bold text-[#1e3a5f]">Required Documents</h2>
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 font-semibold">
                    2 required
                  </span>
                </div>
                <div className="space-y-3">
                  {REQUIRED_DOCS.map((doc) => renderDocCard(doc, true))}
                </div>
              </div>

              {/* Optional Documents */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-base font-bold text-[#1e3a5f]">Optional Documents</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                    Speeds up review
                  </span>
                </div>
                <div className="space-y-3">
                  {OPTIONAL_DOCS.map((doc) => renderDocCard(doc, false))}
                </div>
              </div>
            </div>

            {/* ─── Right: Submit Panel ─── */}
            <div className="space-y-4">
              {/* Submit CTA Card — sticky */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sticky top-6">
                <h3 className="text-base font-bold text-[#1e3a5f]">Submit for Verification</h3>
                <p className="text-sm text-gray-500 mt-1 mb-5">
                  Our team will review your profile within 24–48 hours.
                </p>

                {/* Checklist */}
                <div className="space-y-2 mb-6">
                  {[
                    { label: 'Profile complete', done: profileRequirements.ready, href: '/agent/profile' },
                    { label: 'Govt. ID uploaded', done: !!getDocForType('GOVERNMENT_ID') },
                    { label: 'License uploaded', done: !!getDocForType('REAL_ESTATE_LICENSE') },
                    { label: 'Not yet submitted', done: !alreadySubmitted && pStatus === 'DRAFT' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <div
                        className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 ${
                          item.done ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}
                      >
                        {item.done ? (
                          <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>
                        {item.label}
                        {!item.done && 'href' in item && item.href && (
                          <Link href={item.href} className="ml-1 text-[#1e3a5f] hover:underline font-medium">
                            → Fix
                          </Link>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {submitSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-sm font-semibold text-emerald-700">
                      Successfully submitted for verification!
                    </p>
                  </div>
                )}

                {submitMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700">{submitMessage}</p>
                  </div>
                )}

                {alreadySubmitted ? (
                  <div className="w-full h-11 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Already Submitted
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    title={!canSubmit ? 'Complete all requirements to submit' : 'Submit for verification'}
                    className={`w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                      canSubmit && !submitting
                        ? 'bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submit for Verification
                      </>
                    )}
                  </button>
                )}

                {!canSubmit && !alreadySubmitted && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    {!profileRequirements.ready
                      ? 'Complete your profile first'
                      : !requiredDocsUploaded
                      ? 'Upload required documents to continue'
                      : 'Requirements met — ready to submit'}
                  </p>
                )}
              </div>

              {/* What happens next */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-bold text-[#1e3a5f] mb-3">What happens next?</h3>
                <div className="space-y-3">
                  {[
                    { step: '1', text: 'Our team reviews your documents (24–48h)' },
                    { step: '2', text: 'You receive an email with the decision' },
                    { step: '3', text: 'Once approved, all features unlock instantly' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-[#1e3a5f]">{item.step}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
