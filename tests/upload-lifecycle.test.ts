import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockRequireAgentSession = jest.fn<Promise<{ ok: boolean; agentId: string }>, [unknown?]>()
const mockS3ObjectExists = jest.fn<Promise<boolean>, [string]>()
const mockDeleteFromS3 = jest.fn<Promise<void>, [string]>()
const mockCreate = jest.fn<Promise<{ id: string }>, [any]>()
const mockFindMany = jest.fn<Promise<any[]>, [unknown?]>()
const mockFindFirst = jest.fn<Promise<any | null>, [unknown?]>()

jest.mock('next/server', () => {
  class MockNextResponse {
    public status: number
    public body: unknown

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body
      this.status = init?.status ?? 200
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init)
    }
  }

  return { NextResponse: MockNextResponse }
})

jest.mock('@/lib/agentAuth', () => ({
  requireAgentSession: mockRequireAgentSession,
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    manualProperty: {
      findFirst: mockFindFirst,
    },
    manualPropertyMedia: {
      create: mockCreate,
      findMany: mockFindMany,
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/s3', () => ({
  deleteFromS3: mockDeleteFromS3,
  s3ObjectExists: mockS3ObjectExists,
}))

import { POST } from '@/app/api/manual-properties/upload/complete/route'

describe('upload lifecycle regression checks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAgentSession.mockResolvedValue({ ok: true, agentId: 'agent-1' })
    mockFindFirst.mockResolvedValue({ id: 'prop-1', status: 'DRAFT' })
    mockFindMany.mockResolvedValue([])
    mockCreate.mockResolvedValue({ id: 'media-1' })
    mockS3ObjectExists.mockResolvedValue(true)
  })

  it('rejects upload completion when the object is missing from storage', async () => {
    mockS3ObjectExists.mockResolvedValue(false)

    const response = await POST(
      new Request('http://localhost/api/manual-properties/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: 'prop-1',
          category: 'COVER',
          url: 'https://cdn.example.com/image.jpg',
          s3Key: 'public/properties/prop-1/images/image.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 123,
          altText: 'Cover',
        }),
      })
    )

    expect(response.status).toBe(404)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
