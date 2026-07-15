/**
 * CloudFront Signed URL Generator
 * ─────────────────────────────────────────────────────────────────────
 * Enterprise-grade signed URL generation for MillionFlats asset delivery.
 *
 * Uses CloudFront Key Groups + RSA key pairs to generate time-limited
 * signed URLs. Falls back to S3 presigned URLs when CloudFront is not
 * configured (dev/staging environments).
 *
 * Environment variables:
 *   CLOUDFRONT_DOMAIN          — e.g. assets.millionflats.com
 *   CLOUDFRONT_KEY_PAIR_ID     — CloudFront public key ID
 *   CLOUDFRONT_PRIVATE_KEY_B64 — Base64-encoded RSA private key (PEM)
 *   NEXT_PUBLIC_CDN_DOMAIN     — Public CDN URL for client-side (read-only images)
 */

import crypto from 'crypto'

// ─── Configuration ───────────────────────────────────────────────────────────

type CloudFrontConfig = {
  domain: string
  keyPairId: string
  privateKey: string
}

let cachedConfig: CloudFrontConfig | null = null
let configChecked = false

function getCloudFrontConfig(): CloudFrontConfig | null {
  if (configChecked) return cachedConfig
  configChecked = true

  const domain = String(process.env.CLOUDFRONT_DOMAIN || '').trim()
  const keyPairId = String(process.env.CLOUDFRONT_KEY_PAIR_ID || '').trim()
  const privateKeyB64 = String(process.env.CLOUDFRONT_PRIVATE_KEY_B64 || '').trim()

  if (!domain || !keyPairId || !privateKeyB64) {
    console.warn('[cloudfront] CloudFront not configured — falling back to S3 presigned URLs')
    return null
  }

  try {
    const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf-8')
    if (!privateKey.includes('RSA PRIVATE KEY') && !privateKey.includes('PRIVATE KEY')) {
      console.error('[cloudfront] Invalid private key format')
      return null
    }
    cachedConfig = { domain, keyPairId, privateKey }
    return cachedConfig
  } catch (err) {
    console.error('[cloudfront] Failed to decode private key:', err)
    return null
  }
}

/**
 * Check if CloudFront is configured and available.
 */
export function isCloudFrontEnabled(): boolean {
  return getCloudFrontConfig() !== null
}

/**
 * Get the CloudFront distribution domain (without protocol).
 */
export function getCloudFrontDomain(): string | null {
  const config = getCloudFrontConfig()
  return config?.domain ?? null
}

/**
 * Get the full CDN base URL for public asset references.
 * No longer falls back to S3 — CDN is the only valid read path.
 */
export function getCdnBaseUrl(): string {
  const cfDomain = getCloudFrontDomain()
  if (cfDomain) {
    return `https://${cfDomain}`
  }

  // Check explicit CDN_BASE_URL env var
  const explicit = String(process.env.CDN_BASE_URL || '').trim().replace(/\/+$/, '')
  if (explicit) return explicit

  // Check NEXT_PUBLIC_CDN_DOMAIN
  const publicDomain = String(process.env.NEXT_PUBLIC_CDN_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (publicDomain) return `https://${publicDomain}`

  throw new Error('[cloudfront] No CDN base URL configured. Set CDN_BASE_URL or CLOUDFRONT_DOMAIN.')
}

// ─── Signed URL Generation ──────────────────────────────────────────────────

/**
 * Create a CloudFront signed URL for a given S3 key.
 * Falls back to S3 presigned URL if CloudFront is not configured.
 *
 * @param s3Key     - The S3 object key (e.g. "public/projects/damac/gallery/img.jpg")
 * @param ttlSeconds - Time-to-live in seconds (default 900 = 15 min)
 * @returns Object with signed url, expiry time, and whether CF was used
 */
export async function generateSignedUrl(params: {
  s3Key: string
  ttlSeconds?: number
}): Promise<{
  url: string
  expiresAt: Date
  expiresIn: number
  source: 'cloudfront' | 's3-presigned'
}> {
  const s3Key = normalizeKey(params.s3Key)
  const ttl = clampTTL(params.ttlSeconds ?? 900)
  const expiresAt = new Date(Date.now() + ttl * 1000)

  const config = getCloudFrontConfig()

  if (config) {
    const url = createCloudFrontSignedUrl({
      domain: config.domain,
      keyPairId: config.keyPairId,
      privateKey: config.privateKey,
      s3Key,
      expiresAt,
    })
    return { url, expiresAt, expiresIn: ttl, source: 'cloudfront' }
  }

  // Fallback: S3 presigned URL
  const { createSignedGetUrl } = await import('@/lib/s3')
  const signed = await createSignedGetUrl({ key: s3Key, expiresInSeconds: ttl })
  return {
    url: signed.url,
    expiresAt,
    expiresIn: signed.expiresIn,
    source: 's3-presigned',
  }
}

/**
 * Build a public (unsigned) CDN URL for an S3 key.
 * Use this for assets that will be signed at the CDN behavior level
 * OR for truly public assets when CF behaviors allow unsigned access.
 */
export function buildCdnUrl(s3Key: string): string {
  const key = normalizeKey(s3Key)
  const base = getCdnBaseUrl()
  return `${base}/${encodeURIComponent(key).replace(/%2F/g, '/')}`
}

// ─── CloudFront Signed URL Implementation ───────────────────────────────────

function createCloudFrontSignedUrl(params: {
  domain: string
  keyPairId: string
  privateKey: string
  s3Key: string
  expiresAt: Date
}): string {
  const resourceUrl = `https://${params.domain}/${encodeURIComponent(params.s3Key).replace(/%2F/g, '/')}`

  // Create canned policy
  const policy = JSON.stringify({
    Statement: [
      {
        Resource: resourceUrl,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': Math.floor(params.expiresAt.getTime() / 1000),
          },
        },
      },
    ],
  })

  // Sign the policy
  const signer = crypto.createSign('RSA-SHA1')
  signer.update(policy)
  const signature = signer.sign(params.privateKey)

  // Encode for URL safety (CloudFront uses custom base64)
  const encodedSignature = cfBase64Encode(signature)
  const encodedPolicy = cfBase64Encode(Buffer.from(policy))

  return `${resourceUrl}?Policy=${encodedPolicy}&Signature=${encodedSignature}&Key-Pair-Id=${params.keyPairId}`
}

/**
 * CloudFront-safe base64 encoding.
 * Replaces +, =, / with -, _, ~ respectively.
 */
function cfBase64Encode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~')
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeKey(key: string): string {
  return String(key || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
}

function clampTTL(ttl: number): number {
  // Min 30s, Max 24h (86400s)
  return Math.min(86400, Math.max(30, Math.floor(ttl)))
}

// ─── TTL Presets ────────────────────────────────────────────────────────────

/** TTL presets by asset security tier */
export const ASSET_TTL = {
  /** Public images — 24 hours */
  PUBLIC: 86400,
  /** Protected brochures/PDFs — 15 minutes */
  PROTECTED_DOWNLOAD: 900,
  /** Protected viewable (floor plans) — 1 hour */
  PROTECTED_VIEW: 3600,
  /** Premium content — 10 minutes */
  PREMIUM: 600,
  /** Partner/DAMAC assets — 30 minutes */
  PARTNER: 1800,
  /** Private documents (agent docs) — 5 minutes */
  PRIVATE: 300,
  /** AI system docs — 10 minutes */
  AI_SYSTEM: 600,
  /** @deprecated Use AI_SYSTEM */
  AI: 600,
} as const
