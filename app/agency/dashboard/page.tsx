import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgencyShellClient from '../_components/AgencyShellClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Agency Dashboard | MillionFlats' }

const STAT_CARDS = [
  { key: 'totalLeadsReceived',  label: 'Total Leads',    icon: '👥', color: 'bg-blue-50   text-blue-700' },
  { key: 'totalListings',       label: 'Listings',       icon: '🏢', color: 'bg-green-50  text-green-700' },
  { key: 'totalClosedDeals',    label: 'Closed Deals',   icon: '✅', color: 'bg-purple-50 text-purple-700' },
  { key: 'profileCompletion',   label: 'Profile %',      icon: '📊', color: 'bg-amber-50  text-amber-700', suffix: '%' },
  { key: 'verixAgencyScore',    label: 'VerixAgency™',   icon: '⭐', color: 'bg-rose-50   text-rose-700' },
]

export default async function AgencyDashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const profile = userId
    ? await prisma.agencyProfile.findUnique({ where: { userId } })
    : null

  return (
    <AgencyShellClient>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.agencyName ? `Welcome, ${profile.agencyName}` : 'Agency Dashboard'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Status: <span className={`font-semibold ${profile?.onboardingStatus === 'APPROVED' ? 'text-green-600' : 'text-amber-600'}`}>
              {profile?.onboardingStatus?.replace(/_/g, ' ') || 'REGISTERED'}
            </span>
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STAT_CARDS.map(card => (
            <div key={card.key} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className="text-2xl font-bold text-gray-900">
                {(profile as any)?.[card.key] ?? 0}{card.suffix || ''}
              </p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Onboarding prompt */}
        {profile && profile.onboardingStatus !== 'APPROVED' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h2 className="font-semibold text-amber-800 mb-2">Complete Your Agency Profile</h2>
            <p className="text-sm text-amber-700 mb-4">
              Your profile is {profile.profileCompletion}% complete. Complete it to unlock all features and get verified.
            </p>
            <div className="w-full bg-amber-200 rounded-full h-2 mb-4">
              <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${profile.profileCompletion}%` }} />
            </div>
            <a href="/agency/onboarding" className="inline-flex h-9 items-center px-4 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors">
              Continue Onboarding →
            </a>
          </div>
        )}
      </div>
    </AgencyShellClient>
  )
}
