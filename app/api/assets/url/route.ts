/**
 * Universal Secure Asset URL Endpoint
 * ─────────────────────────────────────────────────────────────────────
 * POST /api/assets/url
 *
 * Generates time-limited signed URLs for any S3 asset.
 * Enforces authentication, RBAC, rate limiting, and access tracking.
 *
 * Body:
 *   { key: string, context?: string }
 *
 * Response:
 *   { success: true, url: string, expiresIn: number, source: string }
 *
 * Auth:
 *   - Public assets: no auth required
 *   - Protected/Private: session required, RBAC enforced
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { classifyAsset, authorizeAssetAccess, extractAgentIdFromKey } from '@/lib/assetAuth'
import { generateSignedUrl } from '@/lib/cloudfront'
import { checkAssetRateLimit, trackAssetAccess, buildDownloadGA4Event } from '@/lib/assetTracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  key: z.string().trim().min(1).max(500),
  context: z.string().trim().max(100).optional(),
})

export async function POST(req: Request) {
  try {
    // ── Parse body ──
    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request: key is required' },
        { status: 400 }
      )
    }

    const { key: s3Key, context } = parsed.data

    // ── Classify the asset ──
    const classification = classifyAsset(s3Key)

    // ── Get user session (optional for public assets) ──
    let userContext: {
      userId?: string | null
      role?: string | null
      agentId?: string | null
      agentStatus?: string | null
      subscriptionPlan?: string | null
    } | null = null

    if (classification.requiredRole !== 'GUEST') {
      const session = await getServerSession(authOptions)
      const userId = String((session?.user as any)?.id || '').trim()

      if (!userId) {
        return NextResponse.json(
          { success: false, message: 'Authentication required', loginRequired: true },
          { status: 401 }
        )
      }

      // Load full user context for RBAC
      const dbUser = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          agent: {
            select: {
              id: true,
              status: true,
              subscription: { select: { plan: true, status: true } },
            },
          },
        },
      })

      if (!dbUser) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 401 }
        )
      }

      userContext = {
        userId: dbUser.id,
        role: dbUser.role,
        agentId: dbUser.agent?.id || null,
        agentStatus: dbUser.agent?.status || null,
        subscriptionPlan: dbUser.agent?.subscription?.plan || null,
      }

      // ── Rate limit ──
      const rateCheck = checkAssetRateLimit(`user:${userId}`)
      if (!rateCheck.ok) {
        return NextResponse.json(
          { success: false, message: 'Too many requests. Try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSec) } }
        )
      }
    }

    // ── Authorize access ──
    const ownerAgentId = extractAgentIdFromKey(s3Key)
    const authResult = authorizeAssetAccess({
      user: userContext,
      s3Key,
      ownerAgentId,
    })

    if (!authResult.allowed) {
      return NextResponse.json(
        { success: false, message: authResult.reason },
        { status: authResult.statusCode }
      )
    }

    // ── Generate signed URL ──
    const signed = await generateSignedUrl({
      s3Key,
      ttlSeconds: classification.ttl,
    })

    // ── Track access (non-blocking for protected/private) ──
    if (classification.trackable) {
      const ipAddress = String(req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim()
        || String(req.headers.get('x-real-ip') || '').trim()
        || null
      const userAgent = String(req.headers.get('user-agent') || '').trim() || null
      const referer = String(req.headers.get('referer') || '').trim() || null

      // Fire-and-forget tracking
      trackAssetAccess({
        userId: userContext?.userId,
        userRole: userContext?.role,
        s3Key,
        assetType: classification.assetType,
        action: context === 'download' ? 'download' : 'view',
        ipAddress,
        userAgent,
        referer,
        ttlGranted: signed.expiresIn,
      }).catch(() => {})
    }

    return NextResponse.json(
      {
        success: true,
        url: signed.url,
        expiresIn: signed.expiresIn,
        source: signed.source,
        ...(classification.trackable
          ? { ga4Event: buildDownloadGA4Event({ assetType: classification.assetType, s3Key, userId: userContext?.userId }) }
          : {}),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    )
  } catch (err: any) {
    console.error('[POST /api/assets/url] Error:', err)
    return NextResponse.json(
      { success: false, message: 'Failed to generate secure URL' },
      { status: 500 }
    )
  }
}
