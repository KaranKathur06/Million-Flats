/**
 * Blog Asset URL Normalizer
 * ─────────────────────────────────────────────────────────────────────
 * Runtime transform layer that rewrites legacy S3 URLs in blog data
 * to CDN (CloudFront) URLs before they reach the frontend.
 *
 * This handles BOTH:
 *   1. Structured fields (e.g. featuredImageUrl)
 *   2. Raw HTML content (e.g. content, contentHtml) where images are
 *      embedded as <img src="https://...amazonaws.com/...">
 *
 * WHY: Blogs are tricky because images are stored INSIDE HTML content,
 * not just in discrete fields. A simple field-level rewrite misses them.
 *
 * Usage:
 *   import { normalizeBlogAssets, normalizeBlogListAssets } from '@/lib/blogs/normalizeBlogAssets'
 *
 *   // Single blog (detail page)
 *   const blog = normalizeBlogAssets(rawBlog)
 *
 *   // Blog list (cards)
 *   const blogs = normalizeBlogListAssets(rawBlogs)
 */

import { buildAssetUrl } from '@/lib/assetUrl'

// ─── S3 URL Matching ────────────────────────────────────────────────────────

/**
 * Matches any S3 URL variant inside HTML attributes (src="...", href="...", etc.)
 * Covers:
 *   - https://bucket.s3.region.amazonaws.com/...
 *   - https://s3.region.amazonaws.com/bucket/...
 *   - https://bucket.s3.amazonaws.com/...
 */
const S3_URL_IN_HTML_REGEX = /https?:\/\/[a-z0-9.-]+\.?s3[.-][a-z0-9-]*\.amazonaws\.com\/[^"'\s)}\]]+/gi

// ─── Core Transform Functions ───────────────────────────────────────────────

/**
 * Normalize a single asset URL field.
 * Converts S3 URLs to CDN, passes through CDN/external/relative as-is.
 */
export function normalizeAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return buildAssetUrl(url)
}

/**
 * Transform all S3 URLs embedded within HTML content to CDN URLs.
 *
 * This is critical for blog content which stores images inline:
 *   <img src="https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/public/blogs/...">
 *
 * After transform:
 *   <img src="https://cdn.millionflats.com/public/blogs/...">
 */
export function transformHtmlContent(html: string | null | undefined): string | null {
  if (!html) return null

  return html.replace(S3_URL_IN_HTML_REGEX, (match) => {
    const transformed = buildAssetUrl(match)
    return transformed || match
  })
}

// ─── Blog-Level Transforms ──────────────────────────────────────────────────

/**
 * Normalize all asset URLs in a full blog object (detail view).
 * Handles both structured fields AND embedded HTML content.
 */
export function normalizeBlogAssets<T extends Record<string, any>>(blog: T): T {
  if (!blog) return blog

  const normalized: any = { ...blog }

  // ── Structured fields ──
  if ('featuredImageUrl' in normalized) {
    normalized.featuredImageUrl = normalizeAssetUrl(normalized.featuredImageUrl)
  }

  // ── HTML content fields ──
  if ('content' in normalized && typeof normalized.content === 'string') {
    normalized.content = transformHtmlContent(normalized.content)
  }

  if ('contentHtml' in normalized && typeof normalized.contentHtml === 'string') {
    normalized.contentHtml = transformHtmlContent(normalized.contentHtml)
  }

  // ── JSON content (TipTap editor format) ──
  if ('contentJson' in normalized && normalized.contentJson) {
    normalized.contentJson = transformJsonContent(normalized.contentJson)
  }

  return normalized as T
}

/**
 * Normalize asset URLs for a list of blog cards.
 * Only transforms structured fields (cards don't include full HTML content).
 */
export function normalizeBlogListAssets<T extends Record<string, any>>(blogs: T[]): T[] {
  if (!blogs || !Array.isArray(blogs)) return blogs
  return blogs.map((blog) => {
    if (!blog) return blog
    const normalized: any = { ...blog }

    if ('featuredImageUrl' in normalized) {
      normalized.featuredImageUrl = normalizeAssetUrl(normalized.featuredImageUrl)
    }

    return normalized as T
  })
}

// ─── TipTap JSON Content Transform ─────────────────────────────────────────

/**
 * Recursively walk TipTap JSON content and rewrite S3 URLs in image nodes.
 */
function transformJsonContent(node: any): any {
  if (!node || typeof node !== 'object') return node

  // Clone to avoid mutating the original
  const result = Array.isArray(node) ? [...node] : { ...node }

  // Transform image node src attributes
  if (result.type === 'image' && result.attrs?.src) {
    result.attrs = { ...result.attrs }
    const transformed = normalizeAssetUrl(result.attrs.src)
    if (transformed) {
      result.attrs.src = transformed
    }
  }

  // Transform link href attributes (in case they point to S3 assets)
  if (result.marks && Array.isArray(result.marks)) {
    result.marks = result.marks.map((mark: any) => {
      if (mark.type === 'link' && mark.attrs?.href) {
        const transformed = normalizeAssetUrl(mark.attrs.href)
        if (transformed && transformed !== mark.attrs.href) {
          return { ...mark, attrs: { ...mark.attrs, href: transformed } }
        }
      }
      return mark
    })
  }

  // Recurse into children
  if (result.content && Array.isArray(result.content)) {
    result.content = result.content.map((child: any) => transformJsonContent(child))
  }

  return result
}
