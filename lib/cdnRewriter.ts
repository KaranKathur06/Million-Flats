/**
 * CDN URL Rewriter
 * ─────────────────────────────────────────────────────────────────────
 * Rewrites legacy S3 URLs stored in the database to CDN (CloudFront) URLs.
 *
 * Problem: The database has thousands of records with full S3 URLs like:
 *   https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/public/projects/...
 *
 * Now that S3 is locked down (CloudFront-only), these URLs return 403.
 * This module intercepts them at the application layer and rewrites to:
 *   https://cdn.millionflats.com/public/projects/...
 *
 * Usage:
 *   import { rewriteToCdn } from '@/lib/cdnRewriter'
 *   const safeUrl = rewriteToCdn(someUrlFromDatabase)
 */

// ─── S3 URL Patterns to Match ───────────────────────────────────────────────

/**
 * Matches these S3 URL formats:
 *   https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/...
 *   https://s3.eu-north-1.amazonaws.com/millionflats-prod-assets/...
 *   https://millionflats-prod-assets.s3.amazonaws.com/...
 */
const S3_URL_PATTERNS = [
  // Virtual-hosted style: bucket.s3.region.amazonaws.com
  /^https?:\/\/([a-z0-9.-]+)\.s3[.-][a-z0-9-]*\.amazonaws\.com\//,
  // Path style: s3.region.amazonaws.com/bucket
  /^https?:\/\/s3[.-][a-z0-9-]*\.amazonaws\.com\/([a-z0-9.-]+)\//,
]

/**
 * Extract the S3 key (path) from a full S3 URL.
 * Returns null if the URL doesn't match any known S3 pattern.
 */
function extractS3KeyFromFullUrl(url: string): string | null {
  const trimmed = String(url || '').trim()
  if (!trimmed) return null

  // Virtual-hosted style
  const virtualMatch = trimmed.match(
    /^https?:\/\/[a-z0-9.-]+\.s3[.-][a-z0-9-]*\.amazonaws\.com\/(.+)$/
  )
  if (virtualMatch) return decodeURIComponent(virtualMatch[1]).replace(/\+/g, ' ')

  // Path style
  const pathMatch = trimmed.match(
    /^https?:\/\/s3[.-][a-z0-9-]*\.amazonaws\.com\/[a-z0-9.-]+\/(.+)$/
  )
  if (pathMatch) return decodeURIComponent(pathMatch[1]).replace(/\+/g, ' ')

  return null
}

/**
 * Check if a URL is a raw S3 URL.
 */
export function isS3Url(url: string): boolean {
  const trimmed = String(url || '').trim()
  return S3_URL_PATTERNS.some((p) => p.test(trimmed))
}

// ─── CDN Rewriting ──────────────────────────────────────────────────────────

/**
 * Rewrite a URL to use the CDN domain.
 * - S3 URLs → rewritten to CDN
 * - S3 keys (public/...) → resolved to CDN
 * - Already CDN URLs → returned as-is
 * - Non-S3 URLs (external) → returned as-is
 * - Empty/null → returns empty string
 */
export function rewriteToCdn(url: string | null | undefined): string {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''

  // Already a CDN URL
  const cdnDomain = getCdnDomain()
  if (cdnDomain && trimmed.includes(cdnDomain)) return trimmed

  // Full S3 URL → extract key → build CDN URL
  if (isS3Url(trimmed)) {
    const key = extractS3KeyFromFullUrl(trimmed)
    if (key && cdnDomain) {
      return `https://${cdnDomain}/${encodeURIComponent(key).replace(/%2F/g, '/')}`
    }
    // No CDN configured — return S3 URL as-is (will fail if S3 is locked)
    return trimmed
  }

  // S3 key (no protocol) → resolve to CDN
  if (trimmed.startsWith('public/') || trimmed.startsWith('private/') || trimmed.startsWith('protected/')) {
    if (cdnDomain) {
      return `https://${cdnDomain}/${encodeURIComponent(trimmed).replace(/%2F/g, '/')}`
    }
    // Fallback: build S3 URL
    const s3Base = String(process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
    if (s3Base) {
      return `${s3Base}/${encodeURIComponent(trimmed).replace(/%2F/g, '/')}`
    }
    return trimmed
  }

  // Absolute path or external URL → return as-is
  return trimmed
}

/**
 * Batch rewrite an array of URLs.
 */
export function rewriteAllToCdn(urls: (string | null | undefined)[]): string[] {
  return urls.map(rewriteToCdn).filter(Boolean)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

let _cdnDomain: string | null | undefined

function getCdnDomain(): string | null {
  if (_cdnDomain !== undefined) return _cdnDomain

  const raw = String(process.env.NEXT_PUBLIC_CDN_DOMAIN || process.env.CLOUDFRONT_DOMAIN || '').trim()
  _cdnDomain = raw
    ? raw.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null

  return _cdnDomain
}
