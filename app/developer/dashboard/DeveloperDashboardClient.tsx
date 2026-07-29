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

  const needsAction =
    profile.onboardingStatus === 'PROFILE_INCOMPLETE' ||
    profile.onboardingStatus === 'EMAIL_VERIFIED' ||
    profile.onboardingStatus === 'REGISTERED'

  return (
    <div className="space-y-6">
      {needsAction && (
        <div className="rounded-[2rem] border border-amber-200/80 bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-[0_20px_70px_rgba(245,158,11,0.24)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15">
                <CompletionRing value={completion} />
                <span className="absolute text-sm font-semibold">{completion}%</span>
              </div>
              <div>
                <p className="text-lg font-semibold">Complete your workspace setup</p>
                <p className="mt-1 text-sm text-amber-50">Finish verification and profile completion to unlock full visibility and premium developer tools.</p>
              </div>
            </div>
            <Link href="/developer/onboarding" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">
              Continue setup
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WorkspaceStatCard label="Projects" value={stats.totalProjects} detail={`${stats.publishedProjects} live`} href="/developer/projects" icon="projects" />
        <WorkspaceStatCard label="Leads" value={stats.totalLeads} detail={`${stats.newLeadsThisMonth} this month`} href="/developer/leads" icon="leads" />
        <WorkspaceStatCard label="Views" value={profile.totalProjectViews.toLocaleString()} detail="Marketplace engagement" href="/developer/analytics" icon="analytics" />
        <WorkspaceStatCard label="AI Score" value={profile.aiDeveloperScore !== null ? `${profile.aiDeveloperScore}/100` : '—'} detail="Trust signal" href="/developer/verification" icon="spark" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <WorkspacePanel title="Recent projects" subtitle="Track launches, approvals, and lead momentum from one view">
          {recentProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No projects yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first project to start shaping your workspace.</p>
              <Link href="/developer/projects/create" className="mt-4 inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Create project
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project: any) => (
                <div key={project.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{project.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{project._count?.leads || 0} leads • {project.status.replace('_', ' ')}</p>
                  </div>
                  <Link href={`/developer/projects/${project.id}`} className="text-sm font-semibold text-slate-950 transition hover:text-slate-700">
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>

        <div className="space-y-6">
          <WorkspacePanel title="Workspace health" subtitle="Stay ahead of setup, trust, and activation goals">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Verification progress</span>
                  <span className="text-sm font-semibold text-slate-950">{Math.max(0, Math.min(100, completion))}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-slate-950 to-cyan-500" style={{ width: `${Math.max(0, Math.min(100, completion))}%` }} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</p>
                  <div className="mt-2">
                    <StatusBadge status={profile.onboardingStatus} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Public profile</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{profile.linkedDeveloper ? 'Connected' : 'Pending'}</p>
                </div>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Quick actions" subtitle="Jump into the most common tasks">
            <div className="grid gap-3">
              <Link href="/developer/projects/create" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Create a new project</Link>
              <Link href="/developer/verification" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Upload verification documents</Link>
              <Link href="/developer/analytics" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Open analytics view</Link>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </div>
  )
}
