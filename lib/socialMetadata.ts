import type { Metadata } from 'next'
import { buildAssetUrl } from '@/lib/assetUrl'

export const DEFAULT_SOCIAL_IMAGE = '/meta.jpeg'

type SocialMetadataInput = {
  title: string
  description: string
  url?: string
  type?: 'website' | 'article' | 'profile'
  image?: string | null | Array<string | null | undefined>
  imageAlt?: string
}

function isSignedUrl(url: URL) {
  return Array.from(url.searchParams.keys()).some((key) =>
    /^(?:x-amz-(?:algorithm|credential|date|expires|security-token|signature)|expires|signature|key-pair-id|policy)$/i.test(key),
  )
}

function isNonPublicImagePath(path: string) {
  const segments = path.split('/').filter(Boolean)
  return segments.some((segment) => /^(?:private|protected)$/i.test(segment)) ||
    segments[segments.length - 1]?.toLowerCase() === 'image-placeholder.svg'
}

export function resolveSocialImage(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const value = String(candidate || '').trim()
    if (!value) continue
    if (value.startsWith('/') && !value.startsWith('//')) {
      try {
        const rooted = new URL(value, 'https://metadata.millionflats.invalid')
        if (!isNonPublicImagePath(rooted.pathname) && !isSignedUrl(rooted)) return value
      } catch {
        continue
      }
      continue
    }
    if (/^(?:private|protected)\//i.test(value)) continue

    try {
      const direct = new URL(value)
      if (direct.protocol !== 'https:' || direct.username || direct.password || isSignedUrl(direct)) continue
      if (isNonPublicImagePath(direct.pathname)) continue
      if (!direct.hostname.endsWith('.amazonaws.com')) return value
    } catch {
      // Relative asset keys need to be expanded through the CDN helper below.
    }

    const resolved = buildAssetUrl(value)
    if (!resolved) continue
    if (resolved.startsWith('/') && !resolved.startsWith('//')) return resolved

    try {
      const parsed = new URL(resolved)
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && !isSignedUrl(parsed)) {
        return resolved
      }
    } catch {
      continue
    }
  }

  return DEFAULT_SOCIAL_IMAGE
}

export function buildSocialMetadata({
  title,
  description,
  url,
  type = 'website',
  image,
  imageAlt = title,
}: SocialMetadataInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const imageUrl = resolveSocialImage(...(Array.isArray(image) ? image : [image]))

  return {
    openGraph: {
      title,
      description,
      siteName: 'MillionFlats',
      ...(url ? { url } : {}),
      type,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}
