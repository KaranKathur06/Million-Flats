import { buildAssetUrl } from '@/lib/assetUrl'

/** Platform-wide media fallbacks — single source of truth */
export const MEDIA_FALLBACKS = {
  project: '/images/default-property.jpg',
  developerLogo: '/LOGO.jpeg',
  developerBanner: '/HOMEPAGE.jpg',
  placeholder: '/image-placeholder.svg',
} as const

export type ProjectMediaRow = {
  mediaUrl?: string | null
  mediaType?: string | null
  category?: string | null
  sortOrder?: number | null
}

export type ProjectImageInput = {
  coverImage?: string | null
  isFeatured?: boolean
  media?: ProjectMediaRow[] | null
}

function norm(v: unknown) {
  return String(v || '').trim().toLowerCase()
}

function sortedMedia(media: ProjectMediaRow[]) {
  return [...media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

function firstUrl(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const url = buildAssetUrl(c)
    if (url) return url
  }
  return null
}

/**
 * Project card / listing image priority:
 * 1. Featured media  2. Hero media  3. First gallery media  4. coverImage  5. Any media  6. Fallback
 */
export function resolveProjectImage(
  project: ProjectImageInput,
  fallback: string = MEDIA_FALLBACKS.project
): string {
  const media = sortedMedia(project.media || [])

  const featured = media.find(
    (m) => norm(m.mediaType) === 'featured' || norm(m.category) === 'featured'
  )
  const hero = media.find((m) => norm(m.mediaType) === 'hero' || norm(m.category) === 'hero')
  const firstWithUrl = media.find((m) => String(m.mediaUrl || '').trim())

  return (
    firstUrl(
      featured?.mediaUrl,
      hero?.mediaUrl,
      firstWithUrl?.mediaUrl,
      project.coverImage,
      ...media.map((m) => m.mediaUrl)
    ) ?? fallback
  )
}

/** Resolved developer logo URL for display */
export function resolveDeveloperLogo(logo?: string | null): string {
  return buildAssetUrl(logo) || MEDIA_FALLBACKS.developerLogo
}

/**
 * Developer hero banner priority:
 * banner → first project hero image → null (caller shows branded gradient)
 */
export function resolveDeveloperBanner(
  banner?: string | null,
  firstProjectImage?: string | null
): string | null {
  const direct = buildAssetUrl(banner)
  if (direct) return direct

  if (firstProjectImage) {
    const fromProject = resolveProjectImage({ coverImage: firstProjectImage })
    if (fromProject !== MEDIA_FALLBACKS.project) return fromProject
  }

  return null
}

/** Generic asset resolver */
export function resolveAssetUrl(path?: string | null, fallback?: string): string {
  return buildAssetUrl(path) || fallback || MEDIA_FALLBACKS.placeholder
}

/** Validate stored path looks like a real reference (not empty / broken placeholder) */
export function isValidMediaReference(path?: string | null): boolean {
  if (!path) return false
  const t = String(path).trim()
  if (!t || t === 'null' || t === 'undefined') return false
  if (t === MEDIA_FALLBACKS.placeholder) return false
  return true
}
