import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WorkspacePanel, WorkspaceStatCard } from '@/components/dashboard/WorkspaceShell'

export const metadata: Metadata = { title: 'Agency Dashboard | MillionFlats' }

export default async function AgencyDashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const profile = userId
    ? await prisma.agencyProfile.findUnique({ where: { userId } })
    : null

  return (
    <div className="space-y-6">
      {profile && profile.onboardingStatus !== 'APPROVED' ? (
        <div className="rounded-[2rem] border border-amber-200/80 bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-[0_20px_70px_rgba(245,158,11,0.24)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-100">Workspace readiness</p>
              <h2 className="mt-2 text-2xl font-semibold">Complete your agency profile</h2>
              <p className="mt-2 max-w-2xl text-sm text-amber-50">You are {profile.profileCompletion}% complete. Finish setup to unlock verification, higher trust, and premium agency features.</p>
            </div>
            <Link href="/agency/onboarding" className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">
              Continue onboarding
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WorkspaceStatCard label="Leads" value={(profile as any)?.totalLeadsReceived ?? 0} detail="Qualified buyer inquiries" href="/agency/leads" icon="leads" />
        <WorkspaceStatCard label="Listings" value={(profile as any)?.totalListings ?? 0} detail="Marketplace inventory" href="/agency/listings" icon="listings" />
        <WorkspaceStatCard label="Closed deals" value={(profile as any)?.totalClosedDeals ?? 0} detail="Completed transactions" href="/agency/finance" icon="crm" />
        <WorkspaceStatCard label="AI Score" value={(profile as any)?.aiAgencyScore ?? 0} detail="Agency trust signal" href="/agency/verification" icon="spark" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <WorkspacePanel title="Lead funnel" subtitle="Monitor conversion quality across active campaigns">
          <div className="space-y-4">
            {['New leads', 'Contacted', 'Viewing scheduled', 'Negotiation'].map((label, index) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-28 text-sm text-slate-500">{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-950" style={{ width: `${82 - index * 14}%` }} />
                </div>
                <span className="text-sm font-semibold text-slate-800">{82 - index * 14}%</span>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <div className="space-y-6">
          <WorkspacePanel title="Quick actions" subtitle="Move faster across listings and agents">
            <div className="grid gap-3">
              <Link href="/agency/listings" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Review listings</Link>
              <Link href="/agency/agents" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Manage agents</Link>
              <Link href="/agency/verification" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white">Open verification</Link>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Workspace status" subtitle="Trust and readiness indicators">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{profile?.agencyName || 'Your agency'} </p>
              <p className="mt-2 text-sm text-slate-500">Operational status {profile?.onboardingStatus?.replace(/_/g, ' ') || 'REGISTERED'}</p>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </div>
  )
}
