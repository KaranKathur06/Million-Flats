import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockConsumeVideoRateLimit = jest.fn()
const mockReadCookie = jest.fn()
const mockGetViewerHmacCandidates = jest.fn()
const mockVerifyVideoDeliveryToken = jest.fn()
const mockPrisma = {
  videoRotationAssignment: { findUnique: jest.fn() },
  videoCampaignEvent: { findUnique: jest.fn() },
  videoCampaignDailyMetric: { upsert: jest.fn() },
  $transaction: jest.fn(),
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
jest.mock('@/lib/videoReels/config', () => ({ isVideoReelsEnabled: jest.fn(() => true) }))
jest.mock('@/lib/videoReels/rateLimit', () => ({ consumeVideoRateLimit: (...args: any[]) => mockConsumeVideoRateLimit(...args) }))
jest.mock('@/lib/videoReels/tokens', () => ({
  VIDEO_VIEWER_COOKIE: 'mf_video_viewer',
  readCookie: (...args: any[]) => mockReadCookie(...args),
  getViewerHmacCandidates: (...args: any[]) => mockGetViewerHmacCandidates(...args),
  verifyVideoDeliveryToken: (...args: any[]) => mockVerifyVideoDeliveryToken(...args),
}))

import { POST } from '@/app/api/video-campaigns/events/route'

describe('video campaign event ingestion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConsumeVideoRateLimit.mockResolvedValue({ allowed: true })
    mockReadCookie.mockReturnValue('viewer-cookie-123')
    mockGetViewerHmacCandidates.mockReturnValue(['viewer-hmac-1'])
    mockVerifyVideoDeliveryToken.mockReturnValue({
      version: 1,
      id: 'assignment-1',
      campaignId: 'campaign-1',
      reelId: 'reel-1',
      viewerHmac: 'viewer-hmac-1',
      issuedAt: Math.floor(Date.now() / 1000) - 2,
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    })
    mockPrisma.videoRotationAssignment.findUnique.mockResolvedValue({
      campaignId: 'campaign-1',
      campaign: {
        id: 'campaign-1',
        approvedDestination: '/pricing',
        reelId: 'reel-1',
        reel: { durationMs: 30000 },
        frequencyCap: 10,
      },
      viewerHmac: 'viewer-hmac-1',
    })
    mockPrisma.videoCampaignEvent.findUnique.mockResolvedValue({ id: 'event-1', createdAt: new Date() })
    mockPrisma.videoCampaignDailyMetric.upsert.mockResolvedValue({})
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback({
      videoCampaignEvent: { create: jest.fn().mockResolvedValue({}) },
      videoCampaignDailyMetric: { upsert: mockPrisma.videoCampaignDailyMetric.upsert },
    }))
  })

  it('rejects an impression that fails the visibility threshold', async () => {
    const response = await POST(new Request('https://example.com/api/video-campaigns/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'signed-token',
        eventId: '11111111-1111-4111-8111-111111111111',
        type: 'IMPRESSION',
        visibleRatio: 0.1,
        visibleMs: 500,
      }),
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Impression visibility threshold was not met' })
  })

  it('accepts a valid click event and records metrics once', async () => {
    const response = await POST(new Request('https://example.com/api/video-campaigns/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'signed-token',
        eventId: '22222222-2222-4222-8222-222222222222',
        type: 'CLICK',
        destinationActivated: true,
      }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ accepted: true })
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
