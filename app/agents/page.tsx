import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

function siteUrl() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

function absoluteUrl(path: string) {
  const base = siteUrl()
  if (!base) return ''
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export async function generateMetadata(): Promise<Metadata> {
  const canonical = absoluteUrl('/agents')
  return {
    title: 'Find an Agent | millionflats',
    description: 'Browse and contact verified real estate agents on millionflats. View profiles, listings, and contact options.',
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: 'Find an Agent | millionflats',
      description: 'Browse and contact verified real estate agents on millionflats.',
      url: canonical || undefined,
      type: 'website',
    },
  }
}

type Props = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function AgentsDirectoryPage({ searchParams }: Props) {
  const qRaw = typeof searchParams?.q === 'string' ? searchParams?.q : Array.isArray(searchParams?.q) ? searchParams?.q[0] : ''
  const q = safeString(qRaw)

  const agents = await prisma.agent
    .findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    .catch(() => [])

  const agentIds = agents.map((a) => a.id)

  const listingCounts: Array<{ agentId: string; _count: { _all: number } }> = agentIds.length
    ? await (prisma as any).agentListing
        .groupBy({
          by: ['agentId'],
          where: { agentId: { in: agentIds } },
          _count: { _all: true },
        })
        .catch(() => [])
    : []

  const manualCounts: Array<{ agentId: string; _count: { _all: number } }> = agentIds.length
    ? await (prisma as any).manualProperty
        .groupBy({
          by: ['agentId'],
          where: { agentId: { in: agentIds }, status: 'APPROVED', sourceType: 'MANUAL' },
          _count: { _all: true },
        })
        .catch(() => [])
    : []

  const countMap = new Map<string, number>()
  for (const row of listingCounts) countMap.set(String(row.agentId), (countMap.get(String(row.agentId)) || 0) + (row._count?._all || 0))
  for (const row of manualCounts) countMap.set(String(row.agentId), (countMap.get(String(row.agentId)) || 0) + (row._count?._all || 0))

  const filtered = agents.filter((a) => {
    if (!q) return true
    const name = safeString(a.user?.name)
    const company = safeString(a.company)
    const hay = `${name} ${company}`
    return normalize(hay).includes(normalize(q))
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">Find an Agent</h1>
            <p className="mt-2 text-gray-600">Browse verified partners and contact agents for viewings, pricing, and availability.</p>
          </div>

          <form method="get" className="w-full md:w-auto">
            <div className="flex gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search name or company"
                className="h-11 w-full md:w-[320px] rounded-xl border border-gray-200 bg-white px-4 text-sm"
              />
              <button className="h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold">Search</button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          Showing {filtered.length} of {agents.length} agents
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-8">
            <p className="text-gray-600">No agents match your search.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((agent: any) => {
              const name = safeString(agent?.user?.name) || 'Agent'
              const company = safeString(agent?.company) || 'millionflats Partner'
              const avatar = safeString(agent?.user?.image)
              const id = safeString(agent?.id)
              const slug = slugify(name)
              const href = `/agents/${slug ? `${slug}-` : ''}${id}`
              const listings = countMap.get(id) || 0

              return (
                <div key={id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt={name}
                          width={64}
                          height={64}
                          className="h-16 w-16 object-cover"
                          unoptimized={avatar.startsWith('http')}
                        />
                      ) : (
                        <span className="text-xl font-semibold text-gray-600">{name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-dark-blue truncate">{name}</p>
                      <p className="mt-1 text-sm text-gray-600 truncate">{company}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                          {listings} listings
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            agent?.approved ? 'bg-green-50 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {agent?.approved ? 'Verified' : 'Pending verification'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={href}
                      className="flex-1 h-11 rounded-xl bg-dark-blue text-white font-semibold inline-flex items-center justify-center hover:bg-dark-blue/90"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={href}
                      className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold inline-flex items-center justify-center hover:bg-gray-50"
                    >
                      Listings
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
