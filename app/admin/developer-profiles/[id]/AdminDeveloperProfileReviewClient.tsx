'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  DOCUMENTS_UPLOADED: 'bg-blue-100 text-blue-700',
  PROFILE_COMPLETED: 'bg-purple-100 text-purple-700',
  PROFILE_INCOMPLETE: 'bg-gray-100 text-gray-600',
  REGISTERED: 'bg-gray-100 text-gray-400',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-100 text-red-700',
}

const DOC_LABELS: Record<string, string> = {
  RERA_CERTIFICATE: 'RERA Certificate',
  REGISTRATION_CERTIFICATE: 'Registration Certificate',
  AUTHORIZED_PERSON_ID: 'Authorized Person ID',
  GST_CERTIFICATE: 'GST Certificate',
  PAN_CARD: 'PAN Card',
  BROCHURE: 'Company Brochure',
  OTHER: 'Other',
}

interface Profile {
  id: string
  companyName: string
  description: string | null
  website: string | null
  reraNumber: string | null
  gstNumber: string | null
  panNumber: string | null
  headquarters: string | null
  foundedYear: number | null
  onboardingStatus: string
  kycStatus: string
  profileCompletion: number
  isVerified: boolean
  isFeatured: boolean
  subscriptionPlan: string
  AIDeveloperScore: number | null
  rejectionReason: string | null
  adminNotes: string | null
  linkedDeveloperId: string | null
  linkedDeveloper: { id: string; name: string; slug: string; logo: string | null } | null
  documents: Array<{
    id: string
    documentType: string
    fileUrl: string
    fileName: string | null
    verificationStatus: string
    rejectionReason: string | null
    createdAt: string
  }>
  user: { id: string; email: string; name: string | null; createdAt: string }
}

interface AllDeveloper {
  id: string
  name: string
  slug: string
}

interface Props {
  profile: Profile
  allDevelopers: AllDeveloper[]
}

export default function AdminDeveloperProfileReviewClient({ profile, allDevelopers }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [adminNotes, setAdminNotes] = useState(profile.adminNotes || '')
  const [rejectionReason, setRejectionReason] = useState(profile.rejectionReason || '')
  const [selectedDevId, setSelectedDevId] = useState(profile.linkedDeveloperId || '')
  const [AIScore, setAIScore] = useState(profile.AIDeveloperScore?.toString() || '')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const showMsg = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const callApi = async (action: string, extra?: Record<string, unknown>) => {
    setSaving(action)
    try {
      const res = await fetch(`/api/admin/developer-profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNotes, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) { showMsg(data?.error || 'Action failed'); return }
      showMsg('✓ ' + data.message)
      router.refresh()
    } catch {
      showMsg('Network error. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  const isApproved = profile.onboardingStatus === 'APPROVED'
  const isRejected = profile.onboardingStatus === 'REJECTED'
  const isSuspended = profile.onboardingStatus === 'SUSPENDED'
  const canReview = ['DOCUMENTS_UPLOADED', 'UNDER_REVIEW', 'PROFILE_COMPLETED'].includes(profile.onboardingStatus)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm shadow-xl">
          {toast}
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-gray-900 mb-3">Reject Application</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason that will be shown to the developer.</p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-dark-blue"
              placeholder="e.g. RERA certificate expired, documents unclear..."
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 h-10 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">
                Cancel
              </button>
              <button
                onClick={() => { setShowRejectModal(false); callApi('REJECT', { rejectionReason }) }}
                disabled={!rejectionReason.trim() || saving === 'REJECT'}
                className="flex-1 h-10 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-all">
                {saving === 'REJECT' ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/admin/developer-profiles" className="hover:text-gray-700">Developer Applications</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{profile.companyName || 'Unnamed'}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{profile.companyName || 'Unnamed Company'}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[profile.onboardingStatus] || 'bg-gray-100 text-gray-500'}`}>
              {profile.onboardingStatus.replace(/_/g, ' ')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${profile.kycStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              KYC: {profile.kycStatus}
            </span>
          </div>
          <p className="text-sm text-gray-500">{profile.user.email} · Joined {new Date(profile.user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {canReview && !isApproved && (
            <button
              onClick={() => callApi('APPROVE')}
              disabled={!!saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {saving === 'APPROVE' ? 'Approving...' : '✓ Approve'}
            </button>
          )}
          {!isRejected && !isApproved && (
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={!!saving}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-all"
            >
              Reject
            </button>
          )}
          {isApproved && !isSuspended && (
            <button
              onClick={() => callApi('SUSPEND')}
              disabled={!!saving}
              className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold hover:bg-amber-100 disabled:opacity-50 transition-all"
            >
              {saving === 'SUSPEND' ? 'Suspending...' : 'Suspend'}
            </button>
          )}
          {(isRejected || isSuspended) && (
            <button
              onClick={() => callApi('REACTIVATE')}
              disabled={!!saving}
              className="px-4 py-2 bg-blue-50 text-dark-blue border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 disabled:opacity-50 transition-all"
            >
              {saving === 'REACTIVATE' ? 'Reactivating...' : 'Reactivate'}
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Profile Details</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Website', profile.website],
                ['Headquarters', profile.headquarters],
                ['Founded Year', profile.foundedYear],
                ['RERA Number', profile.reraNumber],
                ['GST Number', profile.gstNumber],
                ['PAN Number', profile.panNumber],
              ].map(([label, val]) => val && (
                <div key={label as string}>
                  <span className="text-gray-400 text-xs block">{label}</span>
                  <span className="text-gray-800 font-medium">{val as string}</span>
                </div>
              ))}
            </div>
            {profile.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-gray-400 text-xs block mb-1">Description</span>
                <p className="text-gray-700 text-sm leading-relaxed">{profile.description}</p>
              </div>
            )}
            {/* Profile completion */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Profile Completion</span>
                <span className="text-xs font-bold text-gray-700">{profile.profileCompletion}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${profile.profileCompletion === 100 ? 'bg-emerald-500' : profile.profileCompletion >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  style={{ width: `${profile.profileCompletion}%` }}
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Uploaded Documents ({profile.documents.length})</h2>
            {profile.documents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{DOC_LABELS[doc.documentType] || doc.documentType}</p>
                        {doc.fileName && <p className="text-xs text-gray-400 truncate">{doc.fileName}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${doc.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700'
                          : doc.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                        {doc.verificationStatus}
                      </span>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-dark-blue font-medium hover:underline">
                        View ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Admin Notes (Internal)</h2>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
              placeholder="Internal notes about this developer profile..."
            />
            <button
              onClick={() => callApi('SAVE_NOTES')}
              disabled={saving === 'SAVE_NOTES'}
              className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
            >
              {saving === 'SAVE_NOTES' ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Link to developer record */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Link to Developer Record</h2>
            <p className="text-xs text-gray-400 mb-3">Connect this profile to an existing admin-seeded developer page.</p>
            <select
              value={selectedDevId}
              onChange={e => setSelectedDevId(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-dark-blue mb-3"
            >
              <option value="">— No link / Auto-create —</option>
              {allDevelopers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              onClick={() => callApi('LINK_DEVELOPER', { developerId: selectedDevId || null })}
              disabled={!!saving}
              className="w-full h-10 bg-dark-blue text-white rounded-xl text-sm font-semibold hover:bg-dark-blue/90 disabled:opacity-50 transition-all"
            >
              {saving === 'LINK_DEVELOPER' ? 'Saving...' : 'Save Link'}
            </button>
          </div>

          {/* AI Score */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-1">AI™ Developer Score</h2>
            <p className="text-xs text-gray-400 mb-3">Override the auto-calculated score (0–100).</p>
            <input
              type="number" min="0" max="100"
              value={AIScore}
              onChange={e => setAIScore(e.target.value)}
              className="w-full h-10 px-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-dark-blue mb-3"
              placeholder="e.g. 78"
            />
            <button
              onClick={() => callApi('SET_AI_SCORE', { AIDeveloperScore: parseInt(AIScore) || null })}
              disabled={!!saving}
              className="w-full h-10 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all"
            >
              {saving === 'SET_AI_SCORE' ? 'Saving...' : 'Set Score'}
            </button>
          </div>

          {/* Featured toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Featured Developer</h2>
                <p className="text-xs text-gray-400 mt-0.5">Show on homepage featured section</p>
              </div>
              <button
                onClick={() => callApi('TOGGLE_FEATURED')}
                disabled={!!saving}
                className={`relative w-11 h-6 rounded-full transition-all ${profile.isFeatured ? 'bg-dark-blue' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${profile.isFeatured ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>

          {/* Rejection reason if rejected */}
          {isRejected && profile.rejectionReason && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <h2 className="font-semibold text-red-700 text-sm mb-2">Rejection Reason</h2>
              <p className="text-sm text-red-600">{profile.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
