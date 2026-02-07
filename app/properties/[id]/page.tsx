import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import PropertyGallery from '@/components/PropertyGallery'
import ClientLazyMap from '@/components/ClientLazyMap'
import DeferredSection from '@/components/DeferredSection'
import ManualPropertyPreview from '@/components/ManualPropertyPreview'
import AmenitiesListModal from '@/components/AmenitiesListModal'
import { reellyFetch } from '@/lib/reelly'
import { buildPropertySlugPath, buildProjectSeoPath, parsePropertyIdFromSlug } from '@/lib/seo'
import { prisma } from '@/lib/prisma'

const didLogProjectResponse = new Set<string>()
const didLogImageGroups = new Set<string>()

const PROJECT_TTL_MS = 10 * 60 * 1000
const DEVELOPERS_TTL_MS = 30 * 60 * 1000

function siteUrl() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

function absoluteUrl(path: string) {
  const base = siteUrl()
  if (!base) return ''
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function clampDescription(s: string, max = 160) {
  const cleaned = s.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1).trimEnd()}…`
}

function takeParagraphs(raw: string, maxParagraphs = 2) {
  const text = safeString(raw)
  if (!text) return ''
  const parts = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.slice(0, Math.max(1, maxParagraphs)).join('\n\n')
}

function extractBedRangeFromUnits(units: unknown[]) {
  const nums: number[] = []
  for (const u of units) {
    const t = safeString((u as any)?.unit_type) || safeString((u as any)?.type) || safeString((u as any)?.name)
    const m = t.match(/\b(\d{1,2})\s*(?:br|bed)\b/i)
    if (m && m[1]) nums.push(Number(m[1]))
  }
  const finite = nums.filter((n) => Number.isFinite(n) && n > 0)
  if (finite.length === 0) return ''
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  return min === max ? `${min}` : `${min}-${max}`
}

function extractAreaFromUnits(units: unknown[]) {
  let min = Number.POSITIVE_INFINITY
  let max = 0
  for (const u of units) {
    const from = safeNumber((u as any)?.size_from ?? (u as any)?.min_size ?? (u as any)?.minSize)
    const to = safeNumber((u as any)?.size_to ?? (u as any)?.max_size ?? (u as any)?.maxSize)
    if (from > 0) min = Math.min(min, from)
    if (to > 0) max = Math.max(max, to)
  }
  if (!Number.isFinite(min) || min <= 0) return ''
  if (max > 0 && max >= min) return `${Math.round(min).toLocaleString()}–${Math.round(max).toLocaleString()} sq ft`
  return `${Math.round(min).toLocaleString()} sq ft`
}

function isUuid(v: string) {
  const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  return uuidRe.test(v)
}

function manualSchemaType(propertyType: string) {
  const t = (propertyType || '').trim().toLowerCase()
  if (t.includes('villa') || t.includes('house')) return 'SingleFamilyResidence'
  if (t.includes('apartment')) return 'Apartment'
  if (t.includes('plot') || t.includes('land')) return 'LandParcel'
  if (t.includes('commercial')) return 'CommercialProperty'
  return 'Residence'
}

function safeCountryCode(country: string) {
  return country === 'India' ? 'IN' : 'AE'
}

type MarkersCacheEntry = {
  expiresAt: number
  items: unknown[]
}

const MARKERS_TTL_MS = 10 * 60 * 1000

let markersCache: MarkersCacheEntry | null = null
let markersInFlight: Promise<unknown[]> | null = null

async function getProjectMarkers(): Promise<unknown[]> {
  const now = Date.now()
  if (markersCache && markersCache.expiresAt > now) return markersCache.items

  if (!markersInFlight) {
    markersInFlight = (async () => {
      try {
        const markersRaw = await reellyFetch<any>('/api/v2/clients/projects/markers', {}, { cacheTtlMs: MARKERS_TTL_MS })
        const items = normalizeListResponse(markersRaw).items
        markersCache = { expiresAt: Date.now() + MARKERS_TTL_MS, items }
        return items
      } catch {
        markersCache = { expiresAt: Date.now() + 60 * 1000, items: [] }
        return []
      }
    })().finally(() => {
      markersInFlight = null
    })
  }

  return markersInFlight
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalize(v: string) {
  return v.trim().toLowerCase()
}

function canOptimizeUrl(src: string) {
  if (typeof src !== 'string') return false
  if (!src.startsWith('http')) return true
  try {
    const u = new URL(src)
    return u.hostname === 'api.reelly.io' || u.hostname === 'reelly-backend.s3.amazonaws.com' || u.hostname === 'images.unsplash.com'
  } catch {
    return false
  }
}

function formatAed(amount: number) {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(amount)
}

function normalizeListResponse(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { items: [] as unknown[], raw }

  const anyRaw = raw as any
  const items =
    Array.isArray(anyRaw.items)
      ? anyRaw.items
      : Array.isArray(anyRaw.results)
        ? anyRaw.results
        : Array.isArray(anyRaw.data)
          ? anyRaw.data
          : Array.isArray(anyRaw)
            ? anyRaw
            : []

  return { items, raw }
}

function toImageUrl(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const u = (v as any).url
    if (typeof u === 'string') return u
  }
  return ''
}

function uniqueUrls(list: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const u of list) {
    if (typeof u !== 'string') continue
    const s = u.trim()
    if (!s) continue
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function extractImageGroups(project: any) {
  const hero: string[] = []
  const gallery: string[] = []
  const architecture: string[] = []
  const interior: string[] = []
  const lobby: string[] = []
  const buildingImages: string[] = []
  const masterPlan: string[] = []
  const unitLayouts: string[] = []
  const amenityIcons: string[] = []

  const cover = toImageUrl(project?.cover_image)
  if (cover) hero.push(cover)

  const isLikelyImageUrl = (u: string) => {
    const s = u.toLowerCase()
    return (
      s.startsWith('http') &&
      (s.includes('.jpg') || s.includes('.jpeg') || s.includes('.png') || s.includes('.webp') || s.includes('.gif') || s.includes('.avif'))
    )
  }

  const pushAnyImage = (value: unknown, into: string[]) => {
    const direct = toImageUrl(value)
    if (direct && isLikelyImageUrl(direct)) {
      into.push(direct)
      return
    }

    if (value && typeof value === 'object') {
      const nested = toImageUrl((value as any).image)
      if (nested && isLikelyImageUrl(nested)) into.push(nested)
    }
  }

  const pushFromArray = (arr: unknown, into: string[]) => {
    const list = Array.isArray(arr) ? (arr as unknown[]) : []
    for (const it of list) {
      pushAnyImage(it, into)
    }
  }

  pushFromArray(project?.architecture, architecture)
  pushFromArray(project?.interior, interior)
  pushFromArray(project?.lobby, lobby)

  gallery.push(...architecture, ...interior, ...lobby)

  const buildingRecords = Array.isArray(project?.buildings) ? (project.buildings as unknown[]) : []
  for (const b of buildingRecords) {
    const u = toImageUrl((b as any)?.cover_image)
    if (u) {
      gallery.push(u)
      buildingImages.push(u)
    }
  }

  const generalPlan = toImageUrl(project?.general_plan)
  if (generalPlan) {
    gallery.push(generalPlan)
    masterPlan.push(generalPlan)
  }

  const typicalUnits = Array.isArray(project?.typical_units) ? (project.typical_units as unknown[]) : []
  for (const tu of typicalUnits) {
    pushFromArray((tu as any)?.layout, unitLayouts)
    pushFromArray((tu as any)?.floor_plans, unitLayouts)
  }

  const amenities = Array.isArray(project?.project_amenities) ? (project.project_amenities as unknown[]) : []
  for (const a of amenities) {
    const u = toImageUrl((a as any)?.icon) || toImageUrl((a as any)?.amenity?.icon)
    if (u) amenityIcons.push(u)
  }

  return {
    hero: uniqueUrls(hero),
    gallery: uniqueUrls(gallery),
    architecture: uniqueUrls(architecture),
    interior: uniqueUrls(interior),
    lobby: uniqueUrls(lobby),
    buildings: uniqueUrls(buildingImages),
    masterPlan: uniqueUrls(masterPlan),
    unitLayouts: uniqueUrls(unitLayouts),
    amenityIcons: uniqueUrls(amenityIcons),
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const rawParam = safeString(params?.id)
  const rawId = parsePropertyIdFromSlug(rawParam) || rawParam
  if (!rawId) return { title: 'Property' }

  if (isUuid(rawId)) {
    const manual = await (prisma as any).manualProperty
      .findFirst({
        where: { id: rawId, status: 'APPROVED', sourceType: 'MANUAL' },
        include: { media: true },
      })
      .catch(() => null)

    if (manual) {
      const title = safeString(manual?.title) || 'Agent Listing'
      const city = safeString(manual?.city)
      const community = safeString(manual?.community)
      const locationLabel = [community, city].filter(Boolean).join(', ')
      const description = clampDescription(
        safeString(manual?.shortDescription) || `Agent-listed property${locationLabel ? ` • ${locationLabel}` : ''}.`
      )

      const images: string[] = Array.isArray(manual?.media)
        ? manual.media
            .map((m: any) => safeString(m?.url))
            .filter(Boolean)
        : []

      const canonicalPath = buildPropertySlugPath({ id: rawId, title }) || `/properties/${encodeURIComponent(rawId)}`
      const canonical = absoluteUrl(canonicalPath)
      const cover = images[0] || ''

      return {
        title: `${title}${locationLabel ? ` in ${locationLabel}` : ''} | Agent Listing | millionflats`,
        description,
        alternates: canonical ? { canonical } : undefined,
        openGraph: {
          title: `${title}${locationLabel ? ` in ${locationLabel}` : ''}`,
          description,
          url: canonical || undefined,
          type: 'article',
          images: cover ? [{ url: cover, alt: title }] : undefined,
        },
        twitter: {
          card: 'summary_large_image',
          title: `${title}${locationLabel ? ` in ${locationLabel}` : ''}`,
          description,
          images: cover ? [cover] : undefined,
        },
      }
    }
  }

  let item: any
  try {
    item = await reellyFetch<any>(`/api/v2/clients/projects/${encodeURIComponent(rawId)}`, {}, { cacheTtlMs: PROJECT_TTL_MS })
  } catch (e) {
    const message = e instanceof Error ? e.message : ''
    if (/Reelly API error:\s*404\b/.test(message)) notFound()
    return { title: 'Property' }
  }

  const title = safeString(item?.name) || safeString(item?.title) || 'Project'
  const developer = safeString(item?.developer)
  const region = safeString(item?.location?.region)
  const district = safeString(item?.location?.district)
  const sector = safeString(item?.location?.sector)
  const locationLabel = [sector, district, region].filter(Boolean).join(', ')

  const projectId = safeString(item?.id) || String(safeNumber(item?.id)) || rawId
  const propertySlugPath = buildPropertySlugPath({ id: projectId, title })
  const seoPath = buildProjectSeoPath({
    id: projectId,
    name: title,
    region,
    district,
    sector,
  })

  const minPrice = safeNumber(item?.min_price)
  const priceLabel = minPrice > 0 ? `From ${formatAed(minPrice)}` : 'Price on Request'
  const description = clampDescription(safeString(item?.description) || `${priceLabel}${locationLabel ? ` • ${locationLabel}` : ''}`)

  const coverUrl = toImageUrl(item?.cover_image) || ''
  const canonicalPath = propertySlugPath || seoPath || `/properties/${encodeURIComponent(projectId)}`
  const canonical = absoluteUrl(canonicalPath)

  return {
    title: `${title}${locationLabel ? ` in ${locationLabel}` : ''} | millionflats`,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: `${title}${locationLabel ? ` in ${locationLabel}` : ''}`,
      description,
      url: canonical || undefined,
      type: 'article',
      images: coverUrl ? [{ url: coverUrl, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title}${locationLabel ? ` in ${locationLabel}` : ''}`,
      description,
      images: coverUrl ? [coverUrl] : undefined,
    },
  }
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const rawParam = safeString(params?.id)
  if (!rawParam) notFound()

  const rawId = parsePropertyIdFromSlug(rawParam) || rawParam
  if (!rawId) notFound()

  if (isUuid(rawId)) {
    const manual = await (prisma as any).manualProperty
      .findFirst({
        where: { id: rawId, status: 'APPROVED', sourceType: 'MANUAL' },
        include: { media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] }, agent: { include: { user: true } } },
      })
      .catch(() => null)

    if (!manual) {
      notFound()
    }

    const title = safeString(manual?.title) || 'Agent Listing'
    const canonicalPath = buildPropertySlugPath({ id: rawId, title })
    if (canonicalPath) {
      const expected = canonicalPath.split('/').pop() || ''
      const current = (rawParam || '').trim()
      if (expected && current !== expected) {
        redirect(canonicalPath)
      }
    }
    const city = safeString(manual?.city)
    const community = safeString(manual?.community)
    const locationLabel = [community, city].filter(Boolean).join(', ')

    const images: string[] = Array.isArray(manual?.media)
      ? manual.media
          .map((m: any) => safeString(m?.url))
          .filter(Boolean)
      : []

    const lat = safeNumber(manual?.latitude)
    const lng = safeNumber(manual?.longitude)
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)

    const canonical = absoluteUrl(`/properties/${encodeURIComponent(rawId)}`)
    const schema = {
      '@context': 'https://schema.org',
      '@type': manualSchemaType(safeString(manual?.propertyType)),
      name: title,
      url: canonical || undefined,
      description: safeString(manual?.shortDescription) || undefined,
      image: images.length > 0 ? images.slice(0, 20) : undefined,
      offers:
        typeof manual?.price === 'number' && manual.price > 0
          ? {
              '@type': 'Offer',
              price: String(manual.price),
              priceCurrency: safeString(manual?.currency) || undefined,
            }
          : undefined,
      address: locationLabel
        ? {
            '@type': 'PostalAddress',
            addressLocality: community || undefined,
            addressRegion: city || undefined,
            addressCountry: safeCountryCode(safeString(manual?.countryCode)),
            streetAddress: safeString(manual?.address) || locationLabel,
          }
        : undefined,
      geo: hasCoords
        ? {
            '@type': 'GeoCoordinates',
            latitude: lat,
            longitude: lng,
          }
        : undefined,
    }

    return (
      <div className="min-h-screen bg-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        <ManualPropertyPreview manual={manual} />
      </div>
    )
  }

  let item: any
  let marker: any = null
  let developerRecord: any = null

  try {
    item = await reellyFetch<any>(`/api/v2/clients/projects/${encodeURIComponent(rawId)}`, {}, { cacheTtlMs: PROJECT_TTL_MS })
  } catch (e) {
    const message = e instanceof Error ? e.message : ''
    if (/Reelly API error:\s*404\b/.test(message)) notFound()
    throw e
  }

  if (!item || typeof item !== 'object') notFound()

  const title = safeString(item?.name) || safeString(item?.title) || 'Project'
  const projectId = safeString(item?.id) || String(safeNumber(item?.id)) || rawId
  const canonicalSlugPath = buildPropertySlugPath({ id: projectId, title })
  if (canonicalSlugPath) {
    const expected = canonicalSlugPath.split('/').pop() || ''
    const current = (rawParam || '').trim()
    if (expected && current !== expected) {
      redirect(canonicalSlugPath)
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const key = String((item as any)?.id ?? rawId)
    if (!didLogProjectResponse.has(key)) {
      didLogProjectResponse.add(key)
      console.log(`[properties/${rawId}] Reelly project response:`)
      console.log(JSON.stringify(item, null, 2))
    }
  }

  const imageGroups = extractImageGroups(item)

  if (process.env.NODE_ENV !== 'production') {
    const key = String((item as any)?.id ?? rawId)
    if (!didLogImageGroups.has(key)) {
      didLogImageGroups.add(key)
      console.log(`[properties/${rawId}] Extracted image groups:`)
      console.log(JSON.stringify(imageGroups, null, 2))
    }
  }

  try {
    const markers = await getProjectMarkers()
    const markerProjectId = safeString(item?.id) || String(safeNumber(item?.id))
    marker =
      (markers as any[]).find((m: any) => String(m?.project_id ?? m?.projectId) === String(markerProjectId)) ||
      null
  } catch {
    marker = null
  }

  try {
    const developersRaw = await reellyFetch<any>('/api/v2/clients/developers', {}, { cacheTtlMs: DEVELOPERS_TTL_MS })
    const developers = normalizeListResponse(developersRaw).items
    const developerId = safeString(item?.developer_id) || String(safeNumber(item?.developer_id))
    const developerName = safeString(item?.developer)

    developerRecord =
      (developerId
        ? developers.find((d: any) => String(d?.id) === String(developerId))
        : null) ||
      (developerName
        ? developers.find((d: any) => normalize(safeString(d?.name)) === normalize(developerName))
        : null) ||
      null
  } catch {
    developerRecord = null
  }

  const developer = safeString(item?.developer)
  const developerName = safeString(developerRecord?.name) || developer
  const developerLogoUrl = toImageUrl(developerRecord?.logo) || toImageUrl(developerRecord?.logo_image) || toImageUrl(developerRecord?.image) || ''
  const developerDescription =
    safeString(developerRecord?.description) || safeString(developerRecord?.about) || safeString(developerRecord?.bio)

  const region = safeString(item?.location?.region)
  const district = safeString(item?.location?.district)
  const sector = safeString(item?.location?.sector)
  const locationParts = [sector, district, region].filter(Boolean)
  const locationLabel = locationParts.join(', ')

  const saleStatus = safeString(item?.sale_status)
  const constructionStatus = safeString(item?.construction_status)
  const completionDate = safeString(item?.completion_date)

  const minPrice = safeNumber(item?.min_price)
  const maxPrice = safeNumber(item?.max_price)
  const priceOnRequest = minPrice <= 0

  const coverUrl = toImageUrl(item?.cover_image)
  const galleries: unknown[] = Array.isArray(item?.galleries)
    ? item.galleries
    : Array.isArray(item?.gallery)
      ? item.gallery
      : []
  const galleryUrls: string[] = galleries.map(toImageUrl).filter(Boolean)
  const images: string[] = [coverUrl, ...galleryUrls].filter(Boolean)

  const curatedGalleryImages = (imageGroups.gallery.length > 0 ? imageGroups.gallery : galleryUrls).slice(0, 18)

  const photoCategories: Array<{ key: string; title: string; urls: string[] }> = [
    { key: 'architecture', title: 'Architecture', urls: (imageGroups as any).architecture || [] },
    { key: 'interior', title: 'Interior', urls: (imageGroups as any).interior || [] },
    { key: 'lobby', title: 'Lobby', urls: (imageGroups as any).lobby || [] },
    { key: 'buildings', title: 'Buildings', urls: (imageGroups as any).buildings || [] },
    { key: 'masterPlan', title: 'Master Plan', urls: (imageGroups as any).masterPlan || [] },
  ]

  const paymentPlans: unknown[] = Array.isArray(item?.payment_plans)
    ? item.payment_plans
    : Array.isArray(item?.paymentPlans)
      ? item.paymentPlans
      : []

  const projectAmenities: unknown[] = Array.isArray(item?.project_amenities)
    ? item.project_amenities
    : []

  const typicalUnits: unknown[] = Array.isArray(item?.typical_units)
    ? item.typical_units
    : []

  const description = takeParagraphs(safeString(item?.description), 2)

  const lat = safeNumber(marker?.latitude ?? marker?.lat ?? item?.location?.latitude)
  const lng = safeNumber(marker?.longitude ?? marker?.lng ?? marker?.lon ?? item?.location?.longitude)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)

  const internalRef =
    safeString(item?.internal_reference) || safeString(item?.internalRef) || safeString(item?.reference) || safeString(item?.ref)

  const seoPath = buildProjectSeoPath({
    id: projectId,
    name: title,
    region,
    district,
    sector,
  })
  const canonicalPath = buildPropertySlugPath({ id: projectId, title }) || seoPath || `/properties/${encodeURIComponent(projectId)}`
  const canonical = absoluteUrl(canonicalPath)
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    url: canonical || undefined,
    description: description || undefined,
    image: uniqueUrls([coverUrl, ...curatedGalleryImages]).slice(0, 20),
    offers:
      minPrice > 0
        ? {
            '@type': 'Offer',
            price: String(minPrice),
            priceCurrency: 'AED',
          }
        : undefined,
    address: locationLabel
      ? {
          '@type': 'PostalAddress',
          addressLocality: district || sector || undefined,
          addressRegion: region || undefined,
          addressCountry: 'AE',
          streetAddress: locationLabel,
        }
      : undefined,
    geo: hasCoords
      ? {
          '@type': 'GeoCoordinates',
          latitude: lat,
          longitude: lng,
        }
      : undefined,
  }

  const bedsLabel = extractBedRangeFromUnits(typicalUnits)
  const areaLabel = extractAreaFromUnits(typicalUnits)
  const keyFacts = [
    { label: 'Beds', value: bedsLabel || '—' },
    { label: 'Baths', value: '—' },
    { label: 'Area', value: areaLabel || '—' },
    { label: 'Price', value: priceOnRequest ? 'On request' : `From ${formatAed(minPrice)}` },
  ]

  const amenityNames = projectAmenities
    .map((a: any) => safeString(a?.amenity?.name) || safeString(a?.name))
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-[#fbfaf7]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="relative h-[60vh] max-h-[70vh] overflow-hidden">
        <Image
          src={coverUrl || '/image-placeholder.svg'}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          unoptimized={(coverUrl || '').startsWith('http') && !canOptimizeUrl(coverUrl || '')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        <div className="absolute inset-0">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-full flex items-end pb-8">
            <div className="w-full flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-[900px]">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold text-white tracking-tight">
                  {title}
                </h1>

                <p className="mt-2 text-white/85 text-sm sm:text-base">
                  {sector ? `${sector}, ` : ''}
                  {district ? `${district}, ` : ''}
                  {region}
                </p>

                <p className="mt-4 text-2xl sm:text-3xl font-semibold text-white">
                  {priceOnRequest ? 'Price on Request' : `From ${formatAed(minPrice)}`}
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  href="/contact"
                  className="inline-flex h-12 px-6 rounded-xl bg-white text-dark-blue font-semibold items-center justify-center shadow-sm hover:bg-white/95"
                >
                  Contact Agent
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6">
            {keyFacts.map((f) => (
              <div key={f.label}>
                <div className="text-2xl sm:text-3xl font-semibold text-dark-blue tracking-tight">{f.value}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-gray-500">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pb-14">
        <div className="space-y-12">
          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Gallery</h2>
            <div className="mt-5 overflow-hidden rounded-2xl">
              <PropertyGallery
                images={curatedGalleryImages.length > 0 ? curatedGalleryImages : images}
                title={title}
                heightClassName="relative h-[320px] sm:h-[420px] md:h-[520px]"
              />
            </div>
          </section>

          {description ? (
            <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
              <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Description</h2>
              <div className="mt-4 max-w-[720px]">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            </section>
          ) : null}

          {paymentPlans.length > 0 && (
            <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
              <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Pricing & Payment Plans</h2>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {minPrice > 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Min price</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">{formatAed(minPrice)}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Min price</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">Price on Request</p>
                  </div>
                )}

                {maxPrice > 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Max price</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">{formatAed(maxPrice)}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-dark-blue">Available payment plans</h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentPlans.map((p: any, idx: number) => {
                    const name = safeString(p?.name) || safeString(p?.title) || `Plan ${idx + 1}`
                    const booking = safeNumber(p?.booking_percent ?? p?.bookingPercentage)
                    const during = safeNumber(p?.during_construction_percent ?? p?.duringConstructionPercent)
                    const handover = safeNumber(p?.on_handover_percent ?? p?.onHandoverPercent)

                    const hasAnyBreakdown = booking > 0 || during > 0 || handover > 0

                    return (
                      <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                        <p className="text-base font-semibold text-dark-blue">{name}</p>

                        {hasAnyBreakdown ? (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {booking > 0 ? (
                              <div className="bg-white rounded-xl p-3 border border-gray-200">
                                <p className="text-xs text-gray-600">Booking</p>
                                <p className="text-lg font-semibold text-dark-blue mt-1">{booking}%</p>
                              </div>
                            ) : null}
                            {during > 0 ? (
                              <div className="bg-white rounded-xl p-3 border border-gray-200">
                                <p className="text-xs text-gray-600">During construction</p>
                                <p className="text-lg font-semibold text-dark-blue mt-1">{during}%</p>
                              </div>
                            ) : null}
                            {handover > 0 ? (
                              <div className="bg-white rounded-xl p-3 border border-gray-200">
                                <p className="text-xs text-gray-600">On handover</p>
                                <p className="text-lg font-semibold text-dark-blue mt-1">{handover}%</p>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-600">Plan breakdown details are not available.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {projectAmenities.length > 0 ? (
            <DeferredSection
              title="Amenities"
              count={projectAmenities.length}
              className="bg-white rounded-3xl p-5 md:p-7 shadow-sm"
            >
              <div className="mt-5">
                <AmenitiesListModal amenities={amenityNames} maxPreview={8} title="Amenities" />
              </div>
            </DeferredSection>
          ) : null}

          {typicalUnits.length > 0 ? (
            <DeferredSection
              title="Typical Units"
              count={typicalUnits.length}
              className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm"
            >
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {typicalUnits.map((u: any, idx: number) => {
                  const unitType = safeString(u?.unit_type) || safeString(u?.type) || safeString(u?.name)
                  const sizeFrom = safeNumber(u?.size_from ?? u?.min_size ?? u?.minSize)
                  const sizeTo = safeNumber(u?.size_to ?? u?.max_size ?? u?.maxSize)
                  const starting = safeNumber(u?.starting_price ?? u?.start_price ?? u?.price_from ?? u?.min_price)

                  const sizeLabel =
                    sizeFrom > 0 && sizeTo > 0
                      ? `${sizeFrom} - ${sizeTo}`
                      : sizeFrom > 0
                        ? `From ${sizeFrom}`
                        : sizeTo > 0
                          ? `Up to ${sizeTo}`
                          : ''

                  const hasAnyInfo = Boolean(unitType) || Boolean(sizeLabel) || starting > 0

                  return (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                      <p className="text-base font-semibold text-dark-blue">{unitType || `Unit ${idx + 1}`}</p>
                      {!hasAnyInfo ? (
                        <p className="mt-3 text-sm text-gray-600">Unit details are not available yet.</p>
                      ) : null}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sizeLabel ? (
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="text-xs text-gray-600">Size range</p>
                            <p className="text-lg font-semibold text-dark-blue mt-1">{sizeLabel}</p>
                          </div>
                        ) : null}
                        {starting > 0 ? (
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="text-xs text-gray-600">Starting price</p>
                            <p className="text-lg font-semibold text-dark-blue mt-1">{formatAed(starting)}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </DeferredSection>
          ) : null}

          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Location</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="order-2 md:order-1">
                <p className="text-sm text-gray-700">{locationLabel || region || 'Location'}</p>
                {developerName ? <p className="mt-2 text-sm text-gray-600">{developerName}</p> : null}
                {constructionStatus ? (
                  <p className="mt-3 text-sm text-gray-600">{constructionStatus.replace(/_/g, ' ')}</p>
                ) : null}
                {completionDate ? <p className="mt-1 text-sm text-gray-600">Completion: {completionDate}</p> : null}
                {internalRef ? <p className="mt-3 text-xs text-gray-500">Ref: {internalRef}</p> : null}

                {hasCoords ? (
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold text-dark-blue hover:underline"
                  >
                    Open in Google Maps
                  </a>
                ) : null}
              </div>

              <div className="order-1 md:order-2">
                {hasCoords ? (
                  <div className="overflow-hidden rounded-2xl bg-gray-50">
                    <ClientLazyMap lat={lat} lng={lng} className="h-[200px] md:h-[240px]" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Map coordinates are not available for this project yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Developer</h2>
            <div className="mt-6 flex items-start gap-4">
              <div className="shrink-0 w-16 h-16 rounded-2xl border border-gray-200 bg-white overflow-hidden relative">
                <Image
                  src={developerLogoUrl || '/image-placeholder.svg'}
                  alt={developerName || 'Developer'}
                  fill
                  className="object-contain p-2"
                  unoptimized={(developerLogoUrl || '').startsWith('http') && !canOptimizeUrl(developerLogoUrl || '')}
                  loading="lazy"
                />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-dark-blue">{developerName || 'Developer'}</p>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {developerDescription || 'Developer profile will be updated soon.'}
                </p>
                {developerName ? (
                  <Link
                    href={`/properties?developer=${encodeURIComponent(developerName)}`}
                    className="mt-4 inline-flex text-sm font-semibold text-dark-blue hover:underline"
                  >
                    View all projects by this developer
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Contact</h2>
            <p className="mt-2 text-sm text-gray-600">Speak to an agent for availability, pricing, and payment options.</p>
            <div className="mt-5">
              <Link
                href="/contact"
                className="h-12 px-6 rounded-xl bg-dark-blue text-white font-semibold inline-flex items-center justify-center"
              >
                Contact Agent
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

