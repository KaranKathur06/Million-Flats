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
const mockManualPropertyCount = jest.fn()

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

jest.mock('@/lib/adminAuth', () => ({
  requireAdminSession: async () => ({ ok: true, session: { user: { role: 'ADMIN' } } }),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: mockProjectFindFirst },
    brochureDownload: { create: mockBrochureDownloadCreate },
    manualProperty: { findMany: mockManualPropertyFindMany, count: mockManualPropertyCount },
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

  it('returns paginated admin properties and city options independently of the current page', async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } })
    mockManualPropertyFindMany
      .mockResolvedValueOnce([{ id: 'property-1', city: 'Lucknow' }])
      .mockResolvedValueOnce([{ city: 'Lucknow' }, { city: 'Rajkot' }])
    mockManualPropertyCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(7984)
      .mockResolvedValue(0)
    mockCityFindMany.mockResolvedValue([{ name: 'Ahmedabad' }])

    const { GET: adminProperties } = await import('@/app/api/admin/properties/route')
    const response = await adminProperties(new Request('http://localhost/api/admin/properties?page=2&pageSize=50'))

    expect(response.status).toBe(200)
    expect(response.body.page).toBe(2)
    expect(response.body.pageSize).toBe(50)
    expect(response.body.totalCount).toBe(1)
    expect(response.body.cityOptions).toEqual(['Ahmedabad', 'Lucknow', 'Rajkot'])
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

  it('returns canonical cities when no public property rows match', async () => {
    mockManualPropertyFindMany.mockResolvedValue([])
    mockCityFindMany.mockResolvedValue([{ id: 'city-rajkot', name: 'Rajkot' }])
    mockCommunityFindMany.mockResolvedValue([])

    const response = await propertyLocations(new Request('http://localhost/api/properties/locations?country=INDIA'))

    expect(response.status).toBe(200)
    expect(response.body.cities).toContain('Rajkot')
  })

  it('keeps canonical city options independent of the selected city and removes spelling duplicates', async () => {
    mockManualPropertyFindMany.mockResolvedValue([{ city: 'Navi-mumbai', locality: 'Kharghar' }])
    mockCityFindMany.mockResolvedValue([
      { id: 'city-navi-1', name: 'Navi Mumbai' },
      { id: 'city-navi-2', name: 'Navi-mumbai' },
      { id: 'city-hyd', name: 'Hyderabad' },
    ])
    mockCommunityFindMany.mockResolvedValue([])

    const response = await propertyLocations(
      new Request('http://localhost/api/properties/locations?country=INDIA&city=Hyderabad'),
    )

    expect(response.status).toBe(200)
    expect(response.body.cities).toEqual(['Hyderabad', 'Navi Mumbai'])
    expect(response.body.cities.filter((city: string) => city === 'Navi Mumbai')).toHaveLength(1)
  })
})
