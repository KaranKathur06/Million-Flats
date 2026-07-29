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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WorkspaceStatCard label="Leads" value={profile?.totalLeadsReceived ?? 0} detail="Qualified buyer inquiries" href="/agency/leads" icon="leads" />
        <WorkspaceStatCard label="Listings" value={profile?.totalListings ?? 0} detail="Total active offers" href="/agency/listings" icon="listings" />
        <WorkspaceStatCard label="Closed deals" value={profile?.totalClosedDeals ?? 0} detail="Transactions closed" href="/agency/finance" icon="crm" />
        <WorkspaceStatCard label="AI score" value={profile?.aiAgencyScore ?? 0} detail="Trust signal" href="/agency/verification" icon="spark" />
      </div>

      {profile && profile.onboardingStatus !== 'APPROVED' ? (
        <WorkspacePanel title="Workspace readiness" subtitle="Keep your agency verified and market-ready">
          <div className="grid gap-4 md:grid-cols-2 items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">Profile completion</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{profile.profileCompletion}%</p>
              <p className="mt-2 text-sm text-slate-500">Finish setup to unlock premium listing exposure and verification benefits.</p>
            </div>
            <div className="space-y-3">
              <Link href="/agency/onboarding" className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Continue onboarding
              </Link>
              <Link href="/agency/verification" className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50">
                Review verification
              </Link>
            </div>
          </div>
        </WorkspacePanel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <WorkspacePanel title="Lead funnel" subtitle="Monitor conversion quality across active pipelines">
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

          <WorkspacePanel title="Workspace status" subtitle="Trusted agency indicators">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{profile?.agencyName || 'Agency profile'}</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {profile?.onboardingStatus?.replace(/_/g, ' ') || 'REGISTERED'}
                </span>
              </div>
              <p className="text-sm text-slate-500">Current readiness score and verification state for your agency workspace.</p>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </div>
  )
}
