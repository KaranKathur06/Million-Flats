import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import PropertyGallery from '@/components/PropertyGallery'
import ClientLazyMap from '@/components/ClientLazyMap'
import DeferredSection from '@/components/DeferredSection'
import ManualPropertyPreview from '@/components/ManualPropertyPreview'
import AmenitiesListModal from '@/components/AmenitiesListModal'
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
    return u.hostname === 'images.unsplash.com'
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

  notFound()
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

  notFound()
}
