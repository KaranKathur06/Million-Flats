 import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockGetServerSession = jest.fn()
const mockGenerateSignedUrl = jest.fn()
const mockTrackAssetAccess = jest.fn()
const mockBuildDownloadGA4Event = jest.fn(() => ({ event_name: 'brochure_download' }))
const mockProjectFindFirst = jest.fn()
const mockBrochureDownloadCreate = jest.fn()
const mockManualPropertyFindMany = jest.fn()
const mockCityFindMany = jest.fn()
const mockCommunityFindMany = jest.fn()

jest.mock('next/server', () => {
  class MockNextResponse {
    body: any
    status: number

    constructor(body: any, init?: { status?: number }) {
      this.body = body
      this.status = init?.status ?? 200
    }

    static json(body: any, init?: { status?: number }) {
      return new MockNextResponse(body, init)
    }
  }

  return { NextResponse: MockNextResponse }
})

jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: mockProjectFindFirst },
    brochureDownload: { create: mockBrochureDownloadCreate },
    manualProperty: { findMany: mockManualPropertyFindMany },
    city: { findMany: mockCityFindMany },
    community: { findMany: mockCommunityFindMany },
  },
}))

jest.mock('@/lib/cloudfront', () => ({
  generateSignedUrl: mockGenerateSignedUrl,
  ASSET_TTL: { PROTECTED_DOWNLOAD: 900 },
}))

jest.mock('@/lib/s3', () => ({
  extractS3KeyFromUrl: (value: string) => {
    const cleaned = String(value || '')
    const match = cleaned.match(/(?:^|\/)(public\/[A-Za-z0-9._\-/]+)$/)
    return match ? match[1] : ''
  },
}))

jest.mock('@/lib/assetTracking', () => ({
  trackAssetAccess: mockTrackAssetAccess,
  buildDownloadGA4Event: mockBuildDownloadGA4Event,
}))

import { POST as brochureDownload } from '@/app/api/projects/[slug]/brochure/download/route'
import { GET as propertyLocations } from '@/app/api/properties/locations/route'

describe('public access regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateSignedUrl.mockResolvedValue({ url: 'https://signed.example/brochure.pdf', expiresIn: 900 })
    mockGetServerSession.mockResolvedValue(null)
    mockProjectFindFirst.mockResolvedValue({
      id: 'project-1',
      slug: 'test-project',
      brochure: {
        id: 'brochure-1',
        fileUrl: 'https://cdn.example.com/brochure.pdf',
        s3Key: 'public/projects/test-project/brochure/brochure.pdf',
        fileName: 'brochure.pdf',
        fileSize: 123,
      },
      brochureUrl: null,
    })
  })

  it('allows public brochure download without authenticating the user session', async () => {
    const response = await brochureDownload(
      new Request('http://localhost/api/projects/test-project/brochure/download', { method: 'POST' }),
      { params: { slug: 'test-project' } }
    )

    expect(mockGetServerSession).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.downloadUrl).toBe('https://signed.example/brochure.pdf')
  })

  it('falls back to canonical city and community records when no manual property matches exist', async () => {
    mockManualPropertyFindMany.mockResolvedValue([])
    mockCityFindMany.mockResolvedValue([{ id: 'city-1', name: 'Dubai' }])
    mockCommunityFindMany.mockResolvedValue([{ id: 'community-1', name: 'Downtown Dubai', cityId: 'city-1' }])

    const response = await propertyLocations(
      new Request('http://localhost/api/properties/locations?country=UAE'),
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.cities).toContain('Dubai')
    expect(response.body.localities).toContain('Downtown Dubai')
  })
})
