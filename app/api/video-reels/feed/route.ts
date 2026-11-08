import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSignedGetUrl } from '@/lib/s3'
import { getRedis } from '@/lib/redis'
import { consumeVideoRateLimit } from '@/lib/videoReels/rateLimit'
import { getHouseReels, getVideoCampaignSettings, isVideoReelsEnabled } from '@/lib/videoReels/config'
import { getSponsoredPositions } from '@/lib/videoReels/policy'
import {
  VIDEO_DELIVERY_TOKEN_TTL_SECONDS,
  VIDEO_VIEWER_COOKIE,
  VIDEO_VIEWER_COOKIE_MAX_AGE,
  createViewerToken,
  getViewerHmacCandidates,
  readCookie,
  signFeedCursor,
  signVideoDeliveryToken,
  verifyFeedCursor,
} from '@/lib/videoReels/tokens'
import { assignSponsoredOpportunity } from '@/lib/videoReels/rotation'

export const runtime = 'nodejs'

const FEED_SIZE = 12

function validViewerToken(value: string | null): value is string {
  return value !== null && /^[A-Za-z0-9_-]{32,100}$/.test(value)
}

function houseCards() {
  return getHouseReels().map((reel) => ({
    id: reel.id,
    title: reel.title,
    caption: reel.caption || null,
    videoUrl: reel.videoUrl,
    posterUrl: reel.posterUrl || null,
    durationMs: null,
    sponsored: false,
    destination: null,
    deliveryToken: null,
    source: 'HOUSE' as const,
  }))
}

async function makePublicCard(reel: {
  id: string
  title: string
  caption: string | null
  mediaObjectKey: string
  durationMs: number
  project: { slug: string } | null
}, sponsored = false, deliveryToken: string | null = null, destination: string | null = null) {
  const media = await createSignedGetUrl({ key: reel.mediaObjectKey, expiresInSeconds: 600 })
  return {
    id: reel.id,
    title: reel.title,
    caption: reel.caption,
    videoUrl: media.url,
    posterUrl: null,
    durationMs: reel.durationMs,
    sponsored,
    destination,
    deliveryToken,
    source: sponsored ? 'SPONSORED' as const : 'ORGANIC' as const,
    projectPath: reel.project ? `/projects/${reel.project.slug}` : null,
  }
}

export async function GET(request: Request) {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ cards: [], nextCursor: null }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const url = new URL(request.url)
  const cursorValue = url.searchParams.get('cursor')
  const cursor = cursorValue ? verifyFeedCursor(cursorValue) : { offset: 0, organicOffset: 0 }
  if (!cursor) {
    return NextResponse.json({ error: 'Invalid or expired feed cursor' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const existingViewerToken = readCookie(request, VIDEO_VIEWER_COOKIE)
  const viewerToken = validViewerToken(existingViewerToken) ? existingViewerToken : createViewerToken()
  let viewerHmacs: string[] = []
  try {
    viewerHmacs = getViewerHmacCandidates(viewerToken)
  } catch {
    console.error('Video sponsorship disabled because viewer HMAC configuration is missing')
  }

  try {
    const settings = await getVideoCampaignSettings()
    const organic = await prisma.videoReel.findMany({
      where: {
        moderationStatus: 'APPROVED',
        mediaVerifiedAt: { not: null },
        mediaDeletedAt: null,
        OR: [
          { projectId: null },
          { project: { is: { status: 'PUBLISHED', isDeleted: false, archivedAt: null } } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: cursor.organicOffset,
      take: FEED_SIZE,
      select: {
        id: true,
        title: true,
        caption: true,
        mediaObjectKey: true,
        durationMs: true,
        project: { select: { slug: true } },
      },
    })

    let redisHealthy = false
    const redis = getRedis()
    if (redis) {
      try {
        await redis.ping()
        redisHealthy = true
      } catch {
        redisHealthy = false
      }
    }

    let mayServeSponsored = redisHealthy
      && viewerHmacs.length > 0
      && String(process.env.VIDEO_DELIVERY_TOKEN_SECRET || '').length >= 32
    if (mayServeSponsored) {
      try {
        const rate = await consumeVideoRateLimit(`feed:${viewerHmacs[0]}`, 120, 60)
        if (!rate.allowed) {
          return NextResponse.json({ error: 'Video feed request limit reached' }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
        }
      } catch {
        mayServeSponsored = false
      }
    }

    const sponsoredPositions = new Set(getSponsoredPositions(cursor.offset, FEED_SIZE, settings.minFeedCardInterval))
    const cards: Array<Record<string, unknown>> = []
    let organicUsed = 0
    const house = getHouseReels()

    for (let position = 0; position < FEED_SIZE; position += 1) {
      let sponsoredCard: Record<string, unknown> | null = null
      if (sponsoredPositions.has(position) && mayServeSponsored) {
        try {
          const assignment = await assignSponsoredOpportunity(viewerHmacs)
          if (assignment.campaign && assignment.tokenId) {
            const issuedAt = Math.floor(Date.now() / 1000)
            const deliveryToken = signVideoDeliveryToken({
              version: 1,
              id: assignment.tokenId,
              campaignId: assignment.campaign.id,
              reelId: assignment.campaign.reel.id,
              viewerHmac: viewerHmacs[0],
              issuedAt,
              expiresAt: issuedAt + VIDEO_DELIVERY_TOKEN_TTL_SECONDS,
            })
            sponsoredCard = await makePublicCard(
              assignment.campaign.reel,
              true,
              deliveryToken,
              assignment.campaign.approvedDestination,
            )
          }
        } catch (error) {
          mayServeSponsored = false
          console.error('Sponsored reel rotation failed; serving organic inventory', error)
        }
      }
      if (sponsoredCard) {
        cards.push(sponsoredCard)
      } else {
        const reel = organic[organicUsed]
        if (reel) {
          try {
            cards.push(await makePublicCard(reel))
            organicUsed += 1
          } catch (error) {
            console.error('Approved organic reel URL could not be prepared', error)
            const item = house[(cursor.offset + position) % Math.max(1, house.length)]
            if (item) cards.push({
              id: item.id,
              title: item.title,
              caption: item.caption || null,
              videoUrl: item.videoUrl,
              posterUrl: item.posterUrl || null,
              durationMs: null,
              sponsored: false,
              destination: null,
              deliveryToken: null,
              source: 'HOUSE',
            })
          }
        } else {
          const item = house[(cursor.offset + position) % Math.max(1, house.length)]
          if (item) {
            cards.push({
              id: item.id,
              title: item.title,
              caption: item.caption || null,
              videoUrl: item.videoUrl,
              posterUrl: item.posterUrl || null,
              durationMs: null,
              sponsored: false,
              destination: null,
              deliveryToken: null,
              source: 'HOUSE',
            })
          }
        }
      }
    }

    const nextCursor = signFeedCursor(cursor.offset + FEED_SIZE, cursor.organicOffset + organicUsed)
    const response = NextResponse.json({ cards, nextCursor }, { headers: { 'Cache-Control': 'no-store' } })
    if (!validViewerToken(existingViewerToken)) {
      response.cookies.set(VIDEO_VIEWER_COOKIE, viewerToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: VIDEO_VIEWER_COOKIE_MAX_AGE,
      })
    }
    return response
  } catch (error) {
    console.error('Video reel feed could not be loaded', error)
    const fallback = houseCards()
    if (fallback.length) {
      return NextResponse.json({ cards: fallback.slice(0, FEED_SIZE), nextCursor: null }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json({ cards: [], nextCursor: null, error: 'Video feed is temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
