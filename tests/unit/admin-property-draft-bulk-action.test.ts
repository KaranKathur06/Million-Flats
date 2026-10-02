jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

jest.mock('@/lib/adminAuth', () => ({ requireAdminSession: jest.fn() }))
jest.mock('@/lib/adminRateLimit', () => ({ checkAdminRateLimit: jest.fn() }))
jest.mock('@/lib/manualPropertyAdminLifecycle', () => ({ applyManualPropertyAdminAction: jest.fn() }))
jest.mock('@/lib/manualPropertyDraftDeletion', () => ({ deleteManualPropertyDraft: jest.fn() }))
jest.mock('@/lib/storageCleanup', () => ({ processStorageCleanupJobs: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { storageCleanupJob: { findMany: jest.fn() } },
}))

import { POST } from '@/app/api/admin/drafts/bulk-action/route'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { applyManualPropertyAdminAction } from '@/lib/manualPropertyAdminLifecycle'
import { deleteManualPropertyDraft } from '@/lib/manualPropertyDraftDeletion'
import { prisma } from '@/lib/prisma'

const mockedAuth = requireAdminSession as jest.MockedFunction<typeof requireAdminSession>
const mockedRateLimit = checkAdminRateLimit as jest.MockedFunction<typeof checkAdminRateLimit>
const mockedAction = applyManualPropertyAdminAction as jest.MockedFunction<typeof applyManualPropertyAdminAction>
const mockedDelete = deleteManualPropertyDraft as jest.MockedFunction<typeof deleteManualPropertyDraft>
const idOne = '00000000-0000-0000-0000-000000000001'
const idTwo = '00000000-0000-0000-0000-000000000002'

function request(body: unknown) {
  return new Request('http://localhost/api/admin/drafts/bulk-action', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('admin property draft bulk actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'ADMIN' } as any)
    mockedRateLimit.mockResolvedValue({ ok: true, remaining: 20 } as any)
    mockedAction.mockResolvedValue({ ok: true, property: { id: idOne } } as any)
    mockedDelete.mockResolvedValue({ ok: true, cleanupJobId: null } as any)
    ;(prisma as any).storageCleanupJob.findMany.mockResolvedValue([])
  })

  it('deduplicates selected IDs and uses the existing publish lifecycle', async () => {
    const response = await POST(request({ ids: [idOne, idOne], action: 'PUBLISH' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.successful).toEqual([idOne])
    expect(mockedAction).toHaveBeenCalledWith(expect.objectContaining({ propertyId: idOne, action: 'publish' }))
    expect(mockedAction).toHaveBeenCalledTimes(1)
  })

  it('rejects non-admin roles before running a mutation', async () => {
    mockedAuth.mockResolvedValue({ ok: true, userId: 'moderator-1', role: 'MODERATOR' } as any)

    const response = await POST(request({ ids: [idOne], action: 'ARCHIVE' }))

    expect(response.status).toBe(403)
    expect(mockedAction).not.toHaveBeenCalled()
  })

  it('reports partial lifecycle failures per selected draft', async () => {
    mockedAction
      .mockResolvedValueOnce({ ok: true, property: { id: idOne } } as any)
      .mockResolvedValueOnce({ ok: false, status: 422, message: 'Listing is incomplete.' } as any)

    const response = await POST(request({ ids: [idOne, idTwo], action: 'PUBLISH' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.partial).toBe(true)
    expect(json.failed).toEqual([{ id: idTwo, message: 'Listing is incomplete.' }])
  })
})