import type { Metadata } from 'next'
import ManualPropertyPreview from '@/components/ManualPropertyPreview'
import { buildManualPropertyPath } from '@/lib/manualPropertyRoutes'
import { getRelatedManualProperties, requirePublicManualProperty } from '@/lib/publicManualProperties'

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

function clampDescription(s: string, max = 160) {
  const cleaned = s.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1).trimEnd()}...`
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const property = await requirePublicManualProperty(params.slug, 'RENT')
  const title = safeString(property?.title) || 'Property for Rent'
  const city = safeString(property?.city)
  const community = safeString(property?.community)
  const locationLabel = [community, city].filter(Boolean).join(', ')
  const description = clampDescription(safeString(property?.shortDescription) || `${title}${locationLabel ? ` in ${locationLabel}` : ''}.`)
  const path = buildManualPropertyPath({ id: property.id, title, intent: property.intent })
  const canonical = absoluteUrl(path)
  const cover = Array.isArray(property?.media) ? safeString(property.media.find((m: any) => m?.category === 'COVER')?.url || property.media[0]?.url) : ''

  return {
    title: `${title}${locationLabel ? ` in ${locationLabel}` : ''} | Rent | millionflats`,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical || undefined,
      type: 'article',
      images: cover ? [{ url: cover, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  }
}

export default async function RentPropertyDetailPage({ params }: { params: { slug: string } }) {
  const property = await requirePublicManualProperty(params.slug, 'RENT')
  const related = await getRelatedManualProperties(property, 3)

  return <ManualPropertyPreview manual={property} related={related} />
}
