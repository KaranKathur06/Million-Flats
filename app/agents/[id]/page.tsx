import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { reellyGetProject } from '@/lib/reelly'
import AgentListingCard from './AgentListingCard'
import ContactAgentForm from './ContactAgentForm'
import ServerPagination from './ServerPagination'

function extractAgentId(input: string) {
  const raw = (input || '').trim()
  if (!raw) return ''
  const parts = raw.split('-')
  const candidate = parts.length > 1 ? parts[parts.length - 1] : raw
  const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  if (uuidRe.test(candidate)) return candidate
  return raw
}

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

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function safeInt(v: unknown, fallback: number) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function clampDescription(s: string, max = 160) {
  const cleaned = s.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1).trimEnd()}…`
}

function toImageUrl(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const u = (v as any).url
    if (typeof u === 'string') return u
  }
  return ''
}

function uniqueStrings(list: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const it of list) {
    const s = (it || '').trim()
    if (!s) continue
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function buildQueryString(params: Record<string, string>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue
    sp.set(k, v)
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

function buildLocationLabel(project: any) {
  const region = safeString(project?.location?.region)
  const district = safeString(project?.location?.district)
  const sector = safeString(project?.location?.sector)
  return [sector, district, region].filter(Boolean).join(', ')
}

function mapProjectToListing(project: any) {
  const id = safeString(project?.id) || String(safeNumber(project?.id))
  const title = safeString(project?.name) || safeString(project?.title) || 'Property'
  const location = buildLocationLabel(project) || 'UAE'
  const price = safeNumber(project?.min_price ?? project?.price ?? 0)
  const bedrooms = safeNumber(project?.beds ?? project?.bedrooms ?? 0)
  const bathrooms = safeNumber(project?.baths ?? project?.bathrooms ?? 0)
  const squareFeet = safeNumber(project?.area ?? project?.size ?? project?.square_feet ?? 0)
  const featured = Boolean(project?.featured ?? false)
  const propertyType = safeString(project?.type) || safeString(project?.property_type) || 'Property'

  const cover = toImageUrl(project?.cover_image)
  const galleries: unknown[] = Array.isArray(project?.galleries)
    ? project.galleries
    : Array.isArray(project?.gallery)
      ? project.gallery
      : []
  const galleryUrls = galleries.map(toImageUrl).filter(Boolean)
  const images = uniqueStrings([cover, ...galleryUrls])

  return {
    id,
    country: 'UAE' as const,
    title,
    location,
    price,
    bedrooms,
    bathrooms,
    squareFeet,
    images,
    featured,
    propertyType,
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = extractAgentId(params?.id || '')
  if (!id) return { title: 'Agent | millionflats' }

  const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true } }).catch(() => null)
  const name = agent?.user?.name || 'Agent'

  const slug = slugify(name)
  const canonicalPath = `/agents/${slug ? `${slug}-` : ''}${id}`
  const canonical = absoluteUrl(canonicalPath)

  const company = agent?.company || 'millionflats Partner'
  const description = clampDescription(
    `View ${name}, ${company}, on millionflats. Explore agent details, verification, and active listings.`
  )

  return {
    title: `${name} | Real Estate Agent | millionflats`,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: `${name} | Real Estate Agent | millionflats`,
      description,
      url: canonical || undefined,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | Real Estate Agent | millionflats`,
      description,
    },
  }
}

export default async function AgentProfilePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const rawParam = safeString(params?.id || '')
  const id = extractAgentId(rawParam)
  if (!id) notFound()

  const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true } })
  if (!agent) notFound()

  const user = agent.user
  const name = user?.name || 'Agent'
  const email = user?.email || ''
  const phone = user?.phone || ''
  const image = user?.image || ''

  const limit = Math.min(24, Math.max(6, safeInt(searchParams?.limit, 9)))
  const page = Math.max(1, safeInt(searchParams?.page, 1))
  const offset = (page - 1) * limit

  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (typeof v === 'string') query[k] = v
    else if (Array.isArray(v) && typeof v[0] === 'string') query[k] = v[0]
  }

  const agentListingRows = await (prisma as any).agentListing
    .findMany({
      where: { agentId: agent.id },
      orderBy: { updatedAt: 'desc' },
      select: { externalId: true },
    })
    .catch(() => [])

  const leadListingRows =
    agentListingRows.length > 0
      ? []
      : await prisma.propertyLead.findMany({
          where: { agentId: agent.id },
          distinct: ['externalId'],
          orderBy: { createdAt: 'desc' },
          select: { externalId: true },
        })

  const sourceListingIds = agentListingRows.length > 0 ? agentListingRows : leadListingRows
  const totalListings = sourceListingIds.length
  const pageIds = sourceListingIds.slice(offset, offset + limit)

  const projectsSettled = (await Promise.allSettled(
    pageIds.map((row: { externalId: string }) => reellyGetProject<any>(String(row.externalId)))
  )) as PromiseSettledResult<any>[]

  const listings = projectsSettled
    .map((r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? mapProjectToListing(r.value) : null))
    .filter(Boolean) as ReturnType<typeof mapProjectToListing>[]

  const areasServed = uniqueStrings(
    listings
      .map((l) => l.location)
      .map((loc) => loc.split(',').map((p) => p.trim()).filter(Boolean))
      .flat()
  ).slice(0, 4)

  const company = agent.company || 'Listing Agent'
  const license = agent.license || ''
  const whatsapp = agent.whatsapp || ''

  const slug = slugify(name)
  const canonicalPath = `/agents/${slug ? `${slug}-` : ''}${agent.id}`
  const canonical = absoluteUrl(canonicalPath)
  const canonicalId = canonicalPath.replace('/agents/', '')

  if (rawParam && rawParam !== canonicalId) {
    const qs = buildQueryString(query)
    redirect(`${canonicalPath}${qs}`)
  }

  const about =
    `As a ${company} partner on millionflats, ${name} focuses on helping buyers discover verified premium opportunities. ` +
    `Contact the agent for availability, viewings, and pricing guidance.`

  const schema = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'RealEstateAgent'],
    name,
    url: canonical || undefined,
    image: image || undefined,
    email: email || undefined,
    telephone: phone || undefined,
    worksFor: company
      ? {
          '@type': 'Organization',
          name: company,
        }
      : undefined,
    identifier: license
      ? {
          '@type': 'PropertyValue',
          name: 'License',
          value: license,
        }
      : undefined,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10 pb-28 md:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          <div className="space-y-8">
            <section className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                    {image ? (
                      <Image src={image} alt={name} width={80} height={80} className="h-20 w-20 object-cover" />
                    ) : (
                      <span className="text-2xl font-semibold text-gray-600">{name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Agent</p>
                    <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue truncate">{name}</h1>
                    <p className="mt-2 text-gray-600">{company}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          agent.approved
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {agent.approved ? 'Verified on millionflats' : 'Verification pending'}
                      </span>
                      {license ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                          License {license}
                        </span>
                      ) : null}
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                        Listed on MillionFlats
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
                    >
                      Call
                    </a>
                  ) : null}
                  {whatsapp ? (
                    <a
                      href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                      className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                    >
                      Email
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-600">Total listings</p>
                  <p className="mt-2 text-2xl font-bold text-dark-blue">{totalListings}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-600">Active listings</p>
                  <p className="mt-2 text-2xl font-bold text-dark-blue">{totalListings}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-600">Areas served</p>
                  <p className="mt-2 text-sm font-semibold text-dark-blue">{areasServed.length ? areasServed.join(', ') : 'UAE'}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-600">Response time</p>
                  <p className="mt-2 text-sm font-semibold text-dark-blue">Typically within 24h</p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">About the Agent</h2>
              <p className="mt-3 text-gray-700 leading-relaxed">{about}</p>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-dark-blue">Active Listings</h2>
                  <p className="mt-2 text-sm text-gray-600">Crawlable listings attributed to this agent.</p>
                </div>
                {rawParam && rawParam !== canonicalId ? (
                  <Link href={canonicalPath} className="text-sm font-semibold text-dark-blue hover:underline">
                    View canonical profile
                  </Link>
                ) : null}
              </div>

              {listings.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8">
                  <p className="text-sm text-gray-600">No active listings are available for this agent yet.</p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings.map((l) => (
                    <AgentListingCard key={l.id} listing={l as any} />
                  ))}
                </div>
              )}

              <ServerPagination pathname={canonicalPath} query={query} total={totalListings} limit={limit} page={page} />
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Specializations</h2>
              <p className="mt-2 text-sm text-gray-600">Structured focus areas to help buyers understand fit.</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                  Luxury homes
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                  Off-plan projects
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                  Investor-ready deals
                </span>
                {areasServed.map((a) => (
                  <span
                    key={a}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-dark-blue border border-gray-200"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Trust & Verification</h2>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm font-semibold text-dark-blue">License information</p>
                  <p className="mt-2 text-sm text-gray-700">{license ? license : 'License details not provided.'}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm font-semibold text-dark-blue">Company</p>
                  <p className="mt-2 text-sm text-gray-700">{company}</p>
                </div>
              </div>

              <p className="mt-6 text-xs text-gray-500 leading-relaxed">
                Verification badges reflect platform checks and submitted documentation. No guarantee of outcomes is implied.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-serif font-bold text-dark-blue">Contact {name}</h2>
              <p className="mt-2 text-sm text-gray-600">Get availability, pricing guidance, and viewing options.</p>

              <div className="mt-5 space-y-2">
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
                  >
                    Call
                  </a>
                ) : null}
                {whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                    className="inline-flex items-center justify-center w-full h-11 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                  >
                    WhatsApp
                  </a>
                ) : null}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center justify-center w-full h-11 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                  >
                    Email
                  </a>
                ) : null}
              </div>

              <div className="mt-6">
                <ContactAgentForm agentName={name} agentId={agent.id} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {(phone || whatsapp || email) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur border-t border-gray-200">
          <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-2">
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex-1 h-11 rounded-xl bg-dark-blue text-white font-semibold flex items-center justify-center"
              >
                Call
              </a>
            ) : null}
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold flex items-center justify-center"
              >
                WhatsApp
              </a>
            ) : null}
            {email ? (
              <a
                href={`mailto:${email}`}
                className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold flex items-center justify-center"
              >
                Email
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
