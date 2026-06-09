/**
 * Frontend CDN Image Failsafe
 * ─────────────────────────────────────────────────────────────────────
 * Safety layer that catches any S3 URLs that slip through the backend
 * normalization. This should rarely fire — it's a defensive fallback.
 *
 * Usage:
 *   import { fixImageUrl } from '@/lib/fixImageUrl'
 *
 *   <Image src={fixImageUrl(blog.featuredImageUrl)} ... />
 *   <img src={fixImageUrl(someUrl)} />
 */

const CDN_BASE = process.env.NEXT_PUBLIC_CDN_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_CDN_DOMAIN}`
  : ''

/**
 * S3 URL pattern — catches all common S3 URL formats:
 *   https://bucket.s3.region.amazonaws.com/...
 *   https://s3.region.amazonaws.com/bucket/...
 */
const S3_URL_PATTERN = /^https?:\/\/[a-z0-9.-]*s3[.-][a-z0-9-]*\.amazonaws\.com\//i

/**
 * Extracts the S3 object key from a full S3 URL.
 * Handles both virtual-hosted and path-style URLs.
 */
function extractKeyFromS3Url(url: string): string | null {
  // Virtual-hosted: bucket.s3.region.amazonaws.com/key
  const virtualMatch = url.match(
    /^https?:\/\/[a-z0-9.-]+\.s3[.-][a-z0-9-]*\.amazonaws\.com\/(.+)$/i
  )
  if (virtualMatch) return virtualMatch[1]

  // Path-style: s3.region.amazonaws.com/bucket/key
  const pathMatch = url.match(
    /^https?:\/\/s3[.-][a-z0-9-]*\.amazonaws\.com\/[a-z0-9.-]+\/(.+)$/i
  )
  if (pathMatch) return pathMatch[1]

  return null
}

/**
 * Fix an image URL by converting S3 URLs to CDN.
 * Returns the original URL if it's already CDN, external, or relative.
 *
 * @param url - The image URL to fix
 * @param fallback - Optional fallback URL if input is null/undefined
 * @returns Safe CDN URL
 */
export function fixImageUrl(
  url: string | null | undefined,
  fallback: string = '/image-placeholder.svg'
): string {
  if (!url) return fallback

  const trimmed = url.trim()
  if (!trimmed) return fallback

  // Already CDN — pass through
  if (CDN_BASE && trimmed.includes(CDN_BASE.replace('https://', ''))) {
    return trimmed
  }

  // S3 URL — convert to CDN
  if (S3_URL_PATTERN.test(trimmed)) {
    if (!CDN_BASE) return trimmed // No CDN configured

    const key = extractKeyFromS3Url(trimmed)
    if (key) {
      return `${CDN_BASE}/${key}`
    }
  }

  // Relative S3 key stored in DB (public/...)
  if (
    CDN_BASE &&
    (trimmed.startsWith('public/') ||
      trimmed.startsWith('private/') ||
      trimmed.startsWith('protected/'))
  ) {
    return `${CDN_BASE}/${trimmed.replace(/^\/+/, '')}`
  }

  // Absolute local asset
  if (trimmed.startsWith('/')) return trimmed

  return trimmed
}

/**
 * Fix S3 URLs inside an HTML string (for dangerouslySetInnerHTML content).
 * This is the frontend equivalent of the backend transformHtmlContent.
 */
export function fixHtmlImageUrls(html: string | null | undefined): string {
  if (!html) return ''
  if (!CDN_BASE) return html

  return html.replace(
    /https?:\/\/[a-z0-9.-]+\.?s3[.-][a-z0-9-]*\.amazonaws\.com\/[^"'\s)}\]]+/gi,
    (match) => {
      const key = extractKeyFromS3Url(match)
      if (key) return `${CDN_BASE}/${key}`
      return match
    }
  )
}
