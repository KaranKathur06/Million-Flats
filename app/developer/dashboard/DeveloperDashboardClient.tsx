'use client'

import Link from 'next/link'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
  href?: string
}

function StatCard({ label, value, sub, icon, color, href }: StatCardProps) {
  const card = (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
      {href && (
        <p className="text-xs text-dark-blue font-medium mt-3 group-hover:underline">View all →</p>
      )}
    </div>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

function CompletionRing({ value }: { value: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  const gap = circ - dash
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="#F3F4F6" strokeWidth="8" />
      <circle
        cx="45" cy="45" r={r} fill="none"
        stroke={value === 100 ? '#10B981' : value >= 60 ? '#3B82F6' : '#F59E0B'}
        strokeWidth="8"
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
      />
    </svg>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    DOCUMENTS_UPLOADED: 'bg-blue-100 text-blue-700',
    PROFILE_COMPLETED: 'bg-purple-100 text-purple-700',
    PROFILE_INCOMPLETE: 'bg-gray-100 text-gray-600',
    EMAIL_VERIFIED: 'bg-gray-100 text-gray-600',
    REGISTERED: 'bg-gray-100 text-gray-500',
    REJECTED: 'bg-red-100 text-red-700',
    SUSPENDED: 'bg-red-100 text-red-700',
  }
  const label: Record<string, string> = {
    APPROVED: 'Approved',
    UNDER_REVIEW: 'Under Review',
    DOCUMENTS_UPLOADED: 'Docs Uploaded',
    PROFILE_COMPLETED: 'Profile Complete',
    PROFILE_INCOMPLETE: 'Profile Incomplete',
    EMAIL_VERIFIED: 'Email Verified',
    REGISTERED: 'Registered',
    REJECTED: 'Rejected',
    SUSPENDED: 'Suspended',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {label[status] || status}
    </span>
  )
}

interface DashboardData {
  profile: {
    companyName: string
    profileCompletion: number
    onboardingStatus: string
    kycStatus: string
    isVerified: boolean
    isFeatured: boolean
    subscriptionPlan: string
    aiDeveloperScore: number | null
    totalLeadsReceived: number
    totalProjectViews: number
    totalProjectsPublished: number
    linkedDeveloper: { slug: string; name: string } | null
  }
  stats: {
    totalProjects: number
    publishedProjects: number
    draftProjects: number
    underReviewProjects: number
    totalLeads: number
    newLeadsThisMonth: number
  }
  recentProjects: Array<{
    id: string
    name: string
    status: string
    createdAt: string
    _count: { leads: number }
  }>
}

export default function DeveloperDashboardClient({ data }: { data: DashboardData }) {
  const { profile, stats, recentProjects } = data
  const completion = profile.profileCompletion

  const needsAction =
    profile.onboardingStatus === 'PROFILE_INCOMPLETE' ||
    profile.onboardingStatus === 'EMAIL_VERIFIED' ||
    profile.onboardingStatus === 'REGISTERED'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.companyName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={profile.onboardingStatus} />
            {profile.isVerified && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified Developer
              </span>
            )}
            {profile.isFeatured && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
                ⭐ Featured
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {profile.linkedDeveloper && (
            <Link
              href={`/developers/${profile.linkedDeveloper.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Public Profile
            </Link>
          )}
          <Link
            href="/developer/projects/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-dark-blue rounded-xl hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>
      </div>

      {/* Profile Completion CTA */}
      {needsAction && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <CompletionRing value={completion} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{completion}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg">Complete your profile to go live</p>
            <p className="text-blue-100 text-sm mt-1">Your projects won&apos;t be visible to buyers until your profile reaches 100% and gets verified by our team.</p>
            <Link
              href="/developer/onboarding"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-all"
            >
              Continue Setup →
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={stats.totalProjects}
          sub={`${stats.publishedProjects} published`}
          color="bg-blue-50"
          href="/developer/projects"
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>}
        />
        <StatCard
          label="Leads Received"
          value={stats.totalLeads}
          sub={`${stats.newLeadsThisMonth} this month`}
          color="bg-emerald-50"
          href="/developer/leads"
          icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Project Views"
          value={profile.totalProjectViews.toLocaleString()}
          color="bg-purple-50"
          icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
        />
        <StatCard
          label="AI™ Score"
          value={profile.aiDeveloperScore !== null ? `${profile.aiDeveloperScore}/100` : '—'}
          sub="Developer Trust Score"
          color="bg-amber-50"
          href="/developer/AI"
          icon={<svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Projects</h2>
          <Link href="/developer/projects" className="text-sm text-dark-blue font-medium hover:underline">View all</Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <p className="text-gray-500 font-medium">No projects yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first project to get started.</p>
            <Link
              href="/developer/projects/create"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-dark-blue text-white rounded-xl text-sm font-semibold hover:bg-dark-blue/90 transition-all"
            >
              + Create Project
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Project</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Leads</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentProjects.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
                        p.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' :
                          p.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                      }`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p._count?.leads || 0}</td>
                  <td className="px-4 py-3">
                    <Link href={`/developer/projects/${p.id}`} className="text-dark-blue hover:underline text-xs font-medium">Manage →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
