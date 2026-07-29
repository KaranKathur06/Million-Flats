'use client'

import Link from 'next/link'
import { WorkspacePanel, WorkspaceStatCard } from '@/components/dashboard/WorkspaceShell'

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

  const missingActions = [
    profile.onboardingStatus === 'PROFILE_INCOMPLETE' ? 'Complete developer profile' : null,
    profile.onboardingStatus === 'EMAIL_VERIFIED' ? 'Submit final verification documents' : null,
    profile.onboardingStatus === 'REGISTERED' ? 'Verify email and activate workspace' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <WorkspaceStatCard label="Profile completion" value={`${completion}%`} detail="Developer readiness" href="/developer/onboarding" icon="dashboard" />
        <WorkspaceStatCard label="Verification status" value={profile.onboardingStatus.replace(/_/g, ' ')} detail="Approval state" href="/developer/verification" icon="verification" />
        <WorkspaceStatCard label="Subscription" value={profile.subscriptionPlan || 'Standard'} detail="Workspace plan" href="/developer/subscription" icon="billing" />
        <WorkspaceStatCard label="Workspace health" value={profile.isVerified ? 'Live' : 'Pending'} detail="Verification + profile" href="/developer/dashboard" icon="analytics" />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <WorkspaceStatCard label="Projects" value={stats.totalProjects} detail={`${stats.publishedProjects} live`} href="/developer/projects" icon="projects" />
        <WorkspaceStatCard label="Leads" value={stats.totalLeads} detail={`${stats.newLeadsThisMonth} this month`} href="/developer/leads" icon="leads" />
        <WorkspaceStatCard label="Views" value={profile.totalProjectViews.toLocaleString()} detail="Project interest" href="/developer/analytics" icon="analytics" />
        <WorkspaceStatCard label="AI score" value={profile.aiDeveloperScore !== null ? `${profile.aiDeveloperScore}/100` : '—'} detail="Trust signal" href="/developer/verification" icon="spark" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.85fr]">
        <WorkspacePanel title="Project pipeline" subtitle="Active launches and approvals">
          {recentProjects.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No projects to display</p>
              <p className="mt-1 text-sm text-slate-500">Create a project to surface pipeline activity.</p>
              <Link href="/developer/projects/create" className="mt-4 inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Create project
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{project.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{project.status.replace('_', ' ')} • {project._count?.leads || 0} leads</p>
                  </div>
                  <Link href={`/developer/projects/${project.id}`} className="mt-3 inline-flex items-center text-sm font-semibold text-slate-950 hover:text-slate-700 sm:mt-0">
                    View details →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>

        <div className="space-y-6">
          <WorkspacePanel title="Action items" subtitle="What needs your attention now">
            <div className="space-y-3">
              {missingActions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">All key setup items are complete.</div>
              ) : (
                missingActions.map((action) => (
                  <div key={action} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">• {action}</div>
                ))
              )}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Quick actions" subtitle="Common developer tasks">
            <div className="grid gap-3">
              <Link href="/developer/projects/create" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Create project</Link>
              <Link href="/developer/documents" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Upload documents</Link>
              <Link href="/developer/inventory" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Manage inventory</Link>
              <Link href="/developer/leads" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">View leads</Link>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </div>
  )
}
