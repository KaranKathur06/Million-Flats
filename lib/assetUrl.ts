/**
 * Asset URL Builder — Single Source of Truth
 * ─────────────────────────────────────────────────────────────────────
 * Converts relative S3 keys (stored in the database) into full CDN URLs.
 *
 * RULE: The database NEVER stores full URLs. It stores only relative paths
 * like "public/projects/damac/golf-verde/gallery/HERO.PNG".
 *
 * This module is the ONLY place where asset URLs are constructed.
 * Frontend should NEVER construct raw asset paths — it receives ready-made
 * CDN URLs from the backend API responses.
 *
 * Usage (backend only):
 *   import { buildAssetUrl } from '@/lib/assetUrl'
 *   const url = buildAssetUrl(project.coverImage)
 *   // → "https://cdn.millionflats.com/public/projects/..."
 */

// ─── Configuration ──────────────────────────────────────────────────────────

let _cdnBaseUrl: string | undefined

/**
 * Get the CDN base URL from environment.
 * Priority: CDN_BASE_URL → CLOUDFRONT_DOMAIN → NEXT_PUBLIC_CDN_DOMAIN
 */
function getCdnBaseUrl(): string {
  if (_cdnBaseUrl !== undefined) return _cdnBaseUrl

  // Prefer explicit CDN_BASE_URL (e.g. "https://cdn.millionflats.com")
  const explicit = String(process.env.CDN_BASE_URL || '').trim()
  if (explicit) {
    _cdnBaseUrl = explicit.replace(/\/+$/, '')
    return _cdnBaseUrl
  }

  // Fallback: build from domain env vars
  const domain = String(
    process.env.CLOUDFRONT_DOMAIN || process.env.NEXT_PUBLIC_CDN_DOMAIN || ''
  )
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')

  if (domain) {
    _cdnBaseUrl = `https://${domain}`
    return _cdnBaseUrl
  }

  // No CDN configured — empty string (will return paths as-is)
  console.warn('[assetUrl] No CDN_BASE_URL or CLOUDFRONT_DOMAIN configured')
  _cdnBaseUrl = ''
  return _cdnBaseUrl
}

// ─── S3 URL Stripping ───────────────────────────────────────────────────────

/**
 * Known S3 URL prefixes to strip.
 * These patterns match legacy full S3 URLs stored in the database.
 */
const S3_PREFIXES = [
  /^https?:\/\/[a-z0-9.-]+\.s3[.-][a-z0-9-]*\.amazonaws\.com\//i,
  /^https?:\/\/s3[.-][a-z0-9-]*\.amazonaws\.com\/[a-z0-9.-]+\//i,
]

/**
 * Strip any S3 URL prefix from a path, returning just the key.
 * If the input is already a relative key, returns it unchanged.
 */
function stripS3Prefix(input: string): string {
  const trimmed = input.trim()

  for (const pattern of S3_PREFIXES) {
    if (pattern.test(trimmed)) {
      const key = trimmed.replace(pattern, '')
      try {
        return decodeURIComponent(key)
      } catch {
        return key
      }
    }
  }

  return trimmed
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build a full CDN URL from a database-stored path.
 *
 * Handles all input formats:
 * - null/undefined/empty → null
 * - Already a CDN URL → returned as-is
 * - Full S3 URL → stripped to key → CDN URL
 * - Relative key (public/...) → CDN URL
 * - Absolute local path (/images/...) → returned as-is
 * - External URL (https://other.com/...) → returned as-is
 *
 * @param path - The path from the database
 * @returns Full CDN URL, or null if no path
 */
export function buildAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null

  const trimmed = String(path).trim()
  if (!trimmed) return null

  const cdnBase = getCdnBaseUrl()

  // Already a CDN URL — return as-is
  if (cdnBase && trimmed.startsWith(cdnBase)) return trimmed

  // Full S3 URL — strip to key, then build CDN URL
  if (trimmed.includes('.amazonaws.com')) {
    const key = stripS3Prefix(trimmed)
    if (key && cdnBase) {
      return `${cdnBase}/${key}`
    }
    // No CDN configured — return the original (will 403 if S3 locked)
    return trimmed
  }

  // Absolute local path (starts with /) — return as-is
  if (trimmed.startsWith('/')) return trimmed

  // External URL — return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // Relative S3 key — prepend CDN base
  if (cdnBase) {
    return `${cdnBase}/${trimmed}`
  }

  // Fallback: return key as-is
  return trimmed
}

/**
 * Build CDN URLs for an array of paths.
 * Filters out null/empty entries.
 */
export function buildAssetUrls(
  paths: (string | null | undefined)[]
): string[] {
  return paths
    .map(buildAssetUrl)
    .filter((url): url is string => url !== null && url !== '')
}

/**
 * Extract a relative S3 key from any URL format.
 * Use this when you need to normalize a URL stored in the DB to just the key.
 *
 * @param input - Full S3 URL, CDN URL, or relative key
 * @returns The relative S3 key (e.g. "public/projects/.../HERO.PNG")
 */
export function extractRelativeKey(
  input: string | null | undefined
): string | null {
  if (!input) return null

  const trimmed = String(input).trim()
  if (!trimmed) return null

  // Strip S3 prefix if present
  const withoutS3 = stripS3Prefix(trimmed)

  // Strip CDN prefix if present
  const cdnBase = getCdnBaseUrl()
  if (cdnBase && withoutS3.startsWith(cdnBase)) {
    const key = withoutS3.slice(cdnBase.length).replace(/^\/+/, '')
    return key || null
  }

  // Strip protocol + domain from CDN URLs
  const cdnDomain = String(
    process.env.CLOUDFRONT_DOMAIN || process.env.NEXT_PUBLIC_CDN_DOMAIN || ''
  )
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')

  if (cdnDomain) {
    const cdnUrlPattern = new RegExp(
      `^https?://${cdnDomain.replace(/\./g, '\\.')}/`
    )
    if (cdnUrlPattern.test(withoutS3)) {
      return withoutS3.replace(cdnUrlPattern, '')
    }
  }

  // Already a relative key or absolute path — return as-is
  if (
    withoutS3.startsWith('public/') ||
    withoutS3.startsWith('private/') ||
    withoutS3.startsWith('protected/')
  ) {
    return withoutS3
  }

  // Absolute local path or external URL — not an S3 key
  if (withoutS3.startsWith('/') || withoutS3.startsWith('http')) {
    return null
  }

  return withoutS3 || null
}
