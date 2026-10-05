import { beforeEach, describe, expect, it, jest } from '@jest/globals'

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

jest.mock('@/lib/imports/core', () => ({
  analyzeImportBatch: jest.fn(),
  ImportAnalysisConflictError: class ImportAnalysisConflictError extends Error {},
}))

import { POST } from '@/app/api/admin/bulk-import/[batchId]/analyze/route'
import { requireAdminSession } from '@/lib/adminAuth'
import { analyzeImportBatch, ImportAnalysisConflictError } from '@/lib/imports/core'

const mockedAuth = requireAdminSession as jest.MockedFunction<typeof requireAdminSession>
const mockedAnalyze = analyzeImportBatch as jest.MockedFunction<typeof analyzeImportBatch>

function request(body: unknown) {
  return new Request('http://localhost/api/admin/bulk-import/batch-1/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('admin import analysis recovery endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'ADMIN' } as any)
  })

  it('passes explicit recovery mode to the shared analyzer', async () => {
    mockedAnalyze.mockResolvedValue({
      batchId: 'batch-1',
      status: 'ANALYZING',
      total: 5000,
      ready: 0,
      warnings: 0,
      errors: 0,
    })

    const response = await POST(request({ recoveryMode: 'RECOVER' }), { params: { batchId: 'batch-1' } })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.status).toBe('ANALYZING')
    expect(mockedAnalyze).toHaveBeenCalledWith({
      batchId: 'batch-1',
      ownerAgentId: undefined,
      requestMode: 'RECOVER',
    })
  })

  it('returns a conflict instead of a success response when an attempt is still active', async () => {
    mockedAnalyze.mockRejectedValue(new ImportAnalysisConflictError('Analysis is not stale yet.'))

    const response = await POST(request({ recoveryMode: 'RECOVER' }), { params: { batchId: 'batch-1' } })
    const json = await response.json()

    expect(response.status).toBe(409)
    expect(json).toEqual({ success: false, message: 'Analysis is not stale yet.' })
  })

  it('rejects unsupported recovery modes before invoking the analyzer', async () => {
    const response = await POST(request({ recoveryMode: 'FORCE' }), { params: { batchId: 'batch-1' } })

    expect(response.status).toBe(400)
    expect(mockedAnalyze).not.toHaveBeenCalled()
  })
})
