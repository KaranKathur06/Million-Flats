/**
 * Asset Access Tracking Service
 * ─────────────────────────────────────────────────────────────────────
 * Logs every protected/private asset access for audit, analytics, and
 * abuse detection. Integrates with both the database (AssetAccessLog)
 * and GA4 server-side events.
 *
 * Features:
 *   - Per-user rate limiting on signed URL generation
 *   - Database audit trail for all protected/private accesses
 *   - GA4 event emission for download tracking
 *   - Abuse detection (excessive access patterns)
 */

import { prisma } from '@/lib/prisma'

// ─── Types ──────────────────────────────────────────────────────────────────

type TrackAssetAccessParams = {
  userId?: string | null
  userRole?: string | null
  s3Key: string
  assetType: string
  action?: 'view' | 'download'
  ipAddress?: string | null
  userAgent?: string | null
  referer?: string | null
  ttlGranted?: number | null
}

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number }

// ─── In-Memory Rate Limiter ─────────────────────────────────────────────────

/**
 * Simple sliding-window rate limiter for signed URL generation.
 * Prevents abuse without external dependencies (Redis not needed at this scale).
 */
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // max signed URL requests per minute per user
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60_000 // cleanup every 5 min

// Periodic cleanup of expired windows
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanupTimer() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        rateLimitStore.delete(key)
      }
    }
  }, RATE_LIMIT_CLEANUP_INTERVAL)
  // Don't block process exit
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

/**
 * Check rate limit for asset access requests.
 *
 * @param identifier - Unique identifier (usually `user:{userId}` or `ip:{ipAddress}`)
 */
export function checkAssetRateLimit(identifier: string): RateLimitResult {
  ensureCleanupTimer()

  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(identifier, { count: 1, windowStart: now })
    return { ok: true }
  }

  entry.count++

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
    return { ok: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) }
  }

  return { ok: true }
}

// ─── Database Logging ───────────────────────────────────────────────────────

/**
 * Log an asset access event to the database.
 * Non-blocking — errors are caught and logged, never thrown.
 */
export async function trackAssetAccess(params: TrackAssetAccessParams): Promise<void> {
  try {
    await (prisma as any).assetAccessLog.create({
      data: {
        userId: params.userId || null,
        userRole: params.userRole || null,
        s3Key: params.s3Key,
        assetType: params.assetType,
        action: params.action || 'view',
        ipAddress: params.ipAddress || null,
        userAgent: truncate(params.userAgent, 500),
        referer: truncate(params.referer, 500),
        ttlGranted: params.ttlGranted || null,
      },
    })
  } catch (err) {
    // Log but don't fail the request — tracking is best-effort
    console.error('[assetTracking] Failed to log access:', {
      s3Key: params.s3Key,
      error: (err as Error).message,
    })
  }
}

// ─── GA4 Server-Side Event Emission ─────────────────────────────────────────

/**
 * Build GA4 event payload for asset downloads.
 * This generates a dataLayer-compatible event object that can be
 * sent via the GA4 Measurement Protocol or returned to the client.
 */
export function buildDownloadGA4Event(params: {
  assetType: string
  s3Key: string
  projectSlug?: string | null
  userId?: string | null
}): Record<string, string | undefined> {
  const fileName = params.s3Key.split('/').pop() || 'unknown'

  return {
    event_name: 'file_download',
    asset_type: params.assetType,
    file_name: fileName,
    file_path: params.s3Key,
    project_slug: params.projectSlug || undefined,
    user_id: params.userId || undefined,
  }
}

// ─── Analytics Queries ──────────────────────────────────────────────────────

/**
 * Get download count for a specific asset.
 */
export async function getAssetDownloadCount(s3Key: string): Promise<number> {
  try {
    const count = await (prisma as any).assetAccessLog.count({
      where: {
        s3Key,
        action: 'download',
      },
    })
    return count
  } catch {
    return 0
  }
}

/**
 * Get recent download activity for a user.
 * Useful for abuse detection and analytics dashboards.
 */
export async function getUserRecentDownloads(params: {
  userId: string
  sinceMinutes?: number
  limit?: number
}): Promise<Array<{ s3Key: string; assetType: string; createdAt: Date }>> {
  const since = new Date(Date.now() - (params.sinceMinutes || 60) * 60 * 1000)

  try {
    const logs = await (prisma as any).assetAccessLog.findMany({
      where: {
        userId: params.userId,
        action: 'download',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      select: {
        s3Key: true,
        assetType: true,
        createdAt: true,
      },
    })
    return logs
  } catch {
    return []
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(value: string | null | undefined, maxLen: number): string | null {
  if (!value) return null
  const str = String(value).trim()
  return str.length > maxLen ? str.slice(0, maxLen) : str
}
