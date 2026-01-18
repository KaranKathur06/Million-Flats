import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

type Badge = {
  key: string
  label: string
  emoji: string
  how: string
}

type BadgeGroup = {
  category: string
  badges: Badge[]
}

const badgeGroups: BadgeGroup[] = [
  {
    category: 'Performance Excellence',
    badges: [
      {
        key: 'top_closer',
        label: 'Top Closer',
        emoji: '🏆',
        how: 'Earned through a consistently strong verified close rate on completed transactions.',
      },
      {
        key: 'fast_tracker',
        label: 'Fast Tracker',
        emoji: '⚡',
        how: 'Earned by maintaining fast response times and timely follow-ups on verified enquiries.',
      },
      {
        key: 'value_expert',
        label: 'Value Expert',
        emoji: '💎',
        how: 'Earned when recommendations align with market benchmarks and verified deal outcomes.',
      },
    ],
  },
  {
    category: 'Platform Champion',
    badges: [
      {
        key: 'ai_pioneer',
        label: 'AI Pioneer',
        emoji: '🤖',
        how: 'Earned by adopting platform tools that improve listing quality and buyer experience (verified usage).',
      },
      {
        key: 'responsive_pro',
        label: 'Responsive Pro',
        emoji: '👍',
        how: 'Earned by consistently meeting response SLAs across verified enquiries.',
      },
      {
        key: 'volume_leader',
        label: 'Volume Leader',
        emoji: '📊',
        how: 'Earned by completing high transaction volume with verified outcomes over time.',
      },
    ],
  },
  {
    category: 'Niche Expertise',
    badges: [
      {
        key: 'luxury_specialist',
        label: 'Luxury Specialist',
        emoji: '🏙️',
        how: 'Earned by verified performance in premium segments (price bands and property types).',
      },
      {
        key: 'nri_expert',
        label: 'NRI Expert',
        emoji: '🌍',
        how: 'Earned by verified client outcomes for overseas and NRI buyer journeys.',
      },
      {
        key: 'neighborhood_ace',
        label: 'Neighborhood Ace',
        emoji: '📍',
        how: 'Earned by verified expertise and conversion in specific communities and micro-markets.',
      },
    ],
  },
  {
    category: 'Service Quality',
    badges: [
      {
        key: 'client_favorite',
        label: 'Client Favorite',
        emoji: '⭐',
        how: 'Earned by strong verified post-deal reviews from closed transactions.',
      },
      {
        key: 'repeat_winner',
        label: 'Repeat Winner',
        emoji: '🔁',
        how: 'Earned through verified repeat clients and repeat closed deals over time.',
      },
    ],
  },
]

const scoreComponents = [
  {
    key: 'transaction_success',
    label: 'Transaction Success',
    weight: 40,
    description: 'Measures verified close rate, deal reliability, and outcome consistency across completed transactions.',
  },
  {
    key: 'platform_engagement',
    label: 'Platform Engagement',
    weight: 25,
    description: 'Measures verified responsiveness, listing completeness, and quality signals across platform activity.',
  },
  {
    key: 'client_satisfaction',
    label: 'Client Satisfaction',
    weight: 20,
    description: 'Measures verified feedback collected only after closed deals (no open-lead reviews).',
  },
  {
    key: 'market_expertise',
    label: 'Market Expertise',
    weight: 15,
    description: 'Measures verified market coverage, pricing accuracy, and community-level performance signals.',
  },
]

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = (params?.id || '').trim()
  if (!id) return { title: 'Agent | millionflats' }

  const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true } }).catch(() => null)
  const name = agent?.user?.name || 'Agent'

  return {
    title: `${name} | Agent | millionflats`,
    description: `View ${name}'s agent profile, trust badges, and scoring breakdown on millionflats.`,
  }
}

export default async function AgentProfilePage({ params }: { params: { id: string } }) {
  const id = (params?.id || '').trim()
  if (!id) notFound()

  const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true } })
  if (!agent) notFound()

  const user = agent.user
  const name = user?.name || 'Agent'
  const email = user?.email || ''
  const phone = user?.phone || ''
  const image = user?.image || ''

  const earnedBadgeKeys: string[] = []

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="lg:w-[380px]">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                  {image ? (
                    <Image src={image} alt={name} width={64} height={64} className="h-16 w-16 object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-gray-600">{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-serif font-bold text-dark-blue truncate">{name}</h1>
                  <p className="text-sm text-gray-600 mt-1">{agent.company || 'Listing Agent'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${agent.approved ? 'bg-green-50 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {agent.approved ? 'Verified on platform' : 'Verification pending'}
                    </span>
                    {agent.license ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                        License on file
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                {email ? (
                  <a href={`mailto:${email}`} className="block text-sm text-dark-blue hover:underline break-words">
                    {email}
                  </a>
                ) : null}
                {phone ? (
                  <a href={`tel:${phone}`} className="block text-sm text-dark-blue hover:underline">
                    {phone}
                  </a>
                ) : null}
                {agent.whatsapp ? (
                  <a href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`} className="block text-sm text-dark-blue hover:underline">
                    WhatsApp
                  </a>
                ) : null}
              </div>

              <div className="mt-6">
                <Link href="/contact" className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors">
                  Contact Support
                </Link>
              </div>

              <p className="mt-6 text-xs text-gray-500 leading-relaxed">
                Trust badges and scoring are based on verified platform data only. Reviews are collected only from closed deals.
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-10">
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-dark-blue">Agent Badges</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Badges are earned automatically based on verified activity. Locked badges will unlock once eligibility criteria is met.
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-8">
                {badgeGroups.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-lg font-semibold text-dark-blue">{group.category}</h3>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.badges.map((b) => {
                        const earned = earnedBadgeKeys.includes(b.key)
                        return (
                          <div
                            key={b.key}
                            className={`rounded-2xl border p-4 ${earned ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                            title={b.how}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-dark-blue truncate">
                                  <span className="mr-2">{b.emoji}</span>
                                  {b.label}
                                </p>
                                <p className="mt-1 text-xs text-gray-600">Hover for how it’s earned</p>
                              </div>
                              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${earned ? 'bg-white text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-200'}`}>
                                {earned ? 'Earned' : 'Locked'}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Agent Score Breakdown</h2>
              <p className="mt-2 text-sm text-gray-600">
                This panel shows how the agent score is weighted. Individual scores appear only after verified platform activity.
              </p>

              <div className="mt-6 space-y-5">
                {scoreComponents.map((c) => (
                  <div key={c.key} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-dark-blue">{c.label}</p>
                      <span className="text-sm font-semibold text-gray-700">Weight {c.weight}%</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{c.description}</p>
                    <div className="mt-4 h-2 w-full rounded-full bg-white border border-gray-200 overflow-hidden">
                      <div className="h-full bg-dark-blue" style={{ width: `${c.weight}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Status: Pending verified activity</p>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-gray-500 leading-relaxed">
                Future logic: scoring uses only verified transactions, platform signals, and post-close reviews. No guarantees are implied.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
