'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type TabName = 'overview' | 'profile' | 'verification' | 'subscription' | 'kyc' | 'agents' | 'analytics' | 'history'

interface AgencyProfile {
  id: string
  agencyName: string | null
  shortDescription: string | null
  description: string | null
  city: string | null
  country: string | null
  yearEstablished: number | null
  totalAgents: number | null
  agencySize: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo: string | null
  banner: string | null
  specializations: string[]
  operatingAreas: string[]
  licenseNumber: string | null
  reraNumber: string | null
  vatNumber: string | null
  gstNumber: string | null
  panNumber: string | null
  onboardingStatus: string
  kycStatus: string
  profileCompletion: number
  isVerified: boolean
  isFeatured: boolean
  subscriptionPlan: string | null
  subscriptionExpiresAt: string | null
  verifiedAt: string | null
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  suspendedAt: string | null
  suspendedBy: string | null
  adminNotes: string | null
  user: { id: string; email: string; name: string | null; createdAt: string }
  linkedAgency: { id: string; name: string } | null
}

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  UNDER_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-700' },
  PROFILE_COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700' },
  PROFILE_INCOMPLETE: { bg: 'bg-gray-100', text: 'text-gray-600' },
  REGISTERED: { bg: 'bg-gray-100', text: 'text-gray-400' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
  SUSPENDED: { bg: 'bg-orange-100', text: 'text-orange-700' },
}

export default function AgencyDetailClient({ profile }: { profile: AgencyProfile }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabName>('overview')
  const [loading, setLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAction = async (action: string) => {
    setLoading(true)
    setActionMessage(null)
    try {
      const response = await fetch(`/api/admin/agencies/${profile.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (response.ok) {
        setActionMessage({ type: 'success', text: `Agency ${action} successful` })
        setTimeout(() => router.refresh(), 1000)
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Action failed' })
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtTime = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const tabs: { id: TabName; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'Profile' },
    { id: 'verification', label: 'Verification' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'kyc', label: 'KYC' },
    { id: 'agents', label: 'Agents' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'history', label: 'History' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">{profile.agencyName || 'Unnamed Agency'}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_BADGES[profile.onboardingStatus]?.bg || 'bg-gray-100'} ${STATUS_BADGES[profile.onboardingStatus]?.text || 'text-gray-500'}`}>
              {(profile.onboardingStatus || '').replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-gray-600">{profile.user?.email}</p>
        </div>
        <Link
          href="/admin/agencies"
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ← Back to Agencies
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Status</div>
          <div className="text-lg font-bold text-gray-900">{(profile.onboardingStatus || '').replace(/_/g, ' ')}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">KYC</div>
          <div className="text-lg font-bold text-gray-900">{profile.kycStatus}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Completion</div>
          <div className="text-lg font-bold text-gray-900">{profile.profileCompletion}%</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Verified</div>
          <div className="text-lg font-bold text-gray-900">{profile.isVerified ? '✓ Yes' : 'No'}</div>
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`mb-6 p-4 rounded-lg ${actionMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {actionMessage.text}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8 flex gap-3 flex-wrap">
        {profile.onboardingStatus === 'UNDER_REVIEW' && (
          <>
            <button
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </>
        )}
        {profile.onboardingStatus === 'APPROVED' && (
          <button
            onClick={() => handleAction('suspend')}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium text-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            Suspend
          </button>
        )}
        {profile.onboardingStatus === 'SUSPENDED' && (
          <button
            onClick={() => handleAction('reactivate')}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Reactivate
          </button>
        )}
        <button
          onClick={() => {
            const url = `/agencies/${profile.linkedAgency?.id || profile.id}`
            window.open(url, '_blank')
          }}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
        >
          View Public Profile
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-6">
              {profile.city && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">City</h3>
                  <p className="text-gray-900">{profile.city}</p>
                </div>
              )}
              {profile.country && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Country</h3>
                  <p className="text-gray-900">{profile.country}</p>
                </div>
              )}
              {profile.yearEstablished && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Year Established</h3>
                  <p className="text-gray-900">{profile.yearEstablished}</p>
                </div>
              )}
              {profile.totalAgents && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Agents</h3>
                  <p className="text-gray-900">{profile.totalAgents}</p>
                </div>
              )}
              {profile.phone && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Phone</h3>
                  <p className="text-gray-900">{profile.phone}</p>
                </div>
              )}
              {profile.website && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Website</h3>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {profile.website}
                  </a>
                </div>
              )}
            </div>

            {profile.shortDescription && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Short Description</h3>
                <p className="text-gray-700">{profile.shortDescription}</p>
              </div>
            )}

            {profile.description && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{profile.description}</p>
              </div>
            )}

            {profile.adminNotes && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Admin Notes</h3>
                <p className="text-blue-800">{profile.adminNotes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Verification Status</h3>
                <p className="text-lg font-bold text-gray-900">{profile.isVerified ? 'Verified' : 'Not Verified'}</p>
              </div>
              {profile.verifiedAt && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Verified At</h3>
                  <p className="text-gray-900">{fmtTime(profile.verifiedAt)}</p>
                </div>
              )}
              {profile.approvedAt && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Approved At</h3>
                  <p className="text-gray-900">{fmtTime(profile.approvedAt)}</p>
                </div>
              )}
              {profile.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 col-span-2">
                  <h3 className="text-sm font-semibold text-red-900 mb-2">Rejection Reason</h3>
                  <p className="text-red-800">{profile.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {profile.subscriptionPlan && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Plan</h3>
                  <p className="text-lg font-bold text-gray-900">{profile.subscriptionPlan}</p>
                </div>
              )}
              {profile.subscriptionExpiresAt && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Expires At</h3>
                  <p className="text-gray-900">{fmt(profile.subscriptionExpiresAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {profile.licenseNumber && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">License Number</h3>
                  <p className="font-mono text-gray-900">{profile.licenseNumber}</p>
                </div>
              )}
              {profile.reraNumber && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">RERA Number</h3>
                  <p className="font-mono text-gray-900">{profile.reraNumber}</p>
                </div>
              )}
              {profile.gstNumber && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">GST Number</h3>
                  <p className="font-mono text-gray-900">{profile.gstNumber}</p>
                </div>
              )}
              {profile.panNumber && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">PAN Number</h3>
                  <p className="font-mono text-gray-900">{profile.panNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-gray-600 text-sm">Profile editing interface will be available here. Admins can update agency information from this tab.</p>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-gray-600 text-sm">Agent management interface will be available here.</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-gray-600 text-sm">Analytics dashboard will be available here.</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-gray-600 text-sm">Activity history and audit logs will be displayed here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
