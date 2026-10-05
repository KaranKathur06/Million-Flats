jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

jest.mock('@/lib/adminAuth', () => ({
  requireAdminSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: jest.fn(), importBatch: { findUnique: jest.fn() } },
}))

import { GET } from '@/app/api/admin/bulk-import/[batchId]/progress/route'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

const mockedAuth = requireAdminSession as jest.MockedFunction<typeof requireAdminSession>
const mockedPrisma = prisma as any

describe('admin import analysis progress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'ADMIN' } as any)
    mockedPrisma.$queryRaw.mockResolvedValue([{ stale: true }])
  })

  it('marks an analysis stale only after the persisted heartbeat timeout', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'ANALYZING',
      totalRecords: 5000,
      analysisProcessedCount: 125,
      analysisHeartbeatAt: new Date(Date.now() - 11 * 60 * 1000),
      startedAt: new Date(),
      updatedAt: new Date(),
      failureSummary: null,
    })

    const response = await GET(new Request('http://localhost/api/admin/bulk-import/batch-1/progress'), { params: { batchId: 'batch-1' } })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.progress).toMatchObject({
      analysisProcessedCount: 125,
      totalRecords: 5000,
      analysisRecoverable: true,
      analysisFailureMessage: null,
    })
  })

  it('does not offer recovery without a timestamp that proves staleness', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([{ stale: false }])
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'ANALYZING',
      totalRecords: 20,
      analysisProcessedCount: 5,
      analysisHeartbeatAt: null,
      startedAt: null,
      updatedAt: null,
      failureSummary: null,
    })

    const response = await GET(new Request('http://localhost/api/admin/bulk-import/batch-1/progress'), { params: { batchId: 'batch-1' } })
    const json = await response.json()

    expect(json.progress.analysisRecoverable).toBe(false)
  })

  it('identifies analysis failures separately from commit failures', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'FAILED',
      totalRecords: 20,
      analysisProcessedCount: 5,
      analysisHeartbeatAt: null,
      startedAt: null,
      updatedAt: null,
      failureSummary: { stage: 'ANALYSIS', message: 'Database unavailable' },
    })

    const response = await GET(new Request('http://localhost/api/admin/bulk-import/batch-1/progress'), { params: { batchId: 'batch-1' } })
    const json = await response.json()

    expect(json.progress.analysisRecoverable).toBe(false)
    expect(json.progress.analysisFailureMessage).toBe('Database unavailable')
  })
})
