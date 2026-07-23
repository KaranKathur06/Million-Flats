import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Agency Dashboard | MillionFlats' }

const STAT_CARDS = [
  { key: 'totalLeadsReceived', label: 'Total Leads', sub: 'Qualified buyer inquiries', color: 'from-blue-50 to-white' },
  { key: 'totalListings', label: 'Active Listings', sub: 'Marketplace inventory', color: 'from-emerald-50 to-white' },
  { key: 'totalClosedDeals', label: 'Closed Deals', sub: 'Completed transactions', color: 'from-violet-50 to-white' },
  { key: 'profileCompletion', label: 'Profile Health', sub: 'Workspace readiness', color: 'from-amber-50 to-white', suffix: '%' },
  { key: 'AIAgencyScore', label: 'AI Score', sub: 'Agency trust signal', color: 'from-rose-50 to-white' },
]

export default async function AgencyDashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const profile = userId
    ? await prisma.agencyProfile.findUnique({ where: { userId } })
    : null

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Agency command center</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {profile?.agencyName ? `Welcome, ${profile.agencyName}` : 'Agency Dashboard'}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Status:{' '}
              <span className={`font-semibold ${profile?.onboardingStatus === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {profile?.onboardingStatus?.replace(/_/g, ' ') || 'REGISTERED'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/agency/leads" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
              View Leads
            </Link>
            <Link href="/agency/listings" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800">
              Manage Listings
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className={`rounded-2xl border border-white/80 bg-gradient-to-br ${card.color} p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">
              {(profile as any)?.[card.key] ?? 0}{card.suffix || ''}
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Lead Funnel</h2>
              <p className="mt-1 text-sm text-slate-500">Conversion health across active campaigns.</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Live</span>
          </div>
          <div className="mt-6 grid gap-3">
            {['New leads', 'Contacted', 'Viewing scheduled', 'Negotiation'].map((label, index) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-32 text-sm text-slate-500">{label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-slate-950" style={{ width: `${82 - index * 14}%` }} />
                </span>
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-slate-800">{82 - index * 14}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
          <h2 className="text-base font-semibold">AI Recommendations</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Prioritize listings with fresh media, route premium leads to senior agents, and refresh campaign targeting for high-intent buyer cities.
          </p>
        </div>
      </section>

      {profile && profile.onboardingStatus !== 'APPROVED' ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-900">Complete Your Agency Profile</h2>
          <p className="mt-2 text-sm text-amber-800">
            Your profile is {profile.profileCompletion}% complete. Complete it to unlock all features and get verified.
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-amber-200">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${profile.profileCompletion}%` }} />
          </div>
          <Link href="/agency/onboarding" className="mt-4 inline-flex h-10 items-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-600">
            Continue Onboarding
          </Link>
        </section>
      ) : null}
    </div>
  )
}
