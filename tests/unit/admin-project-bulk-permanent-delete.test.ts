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
jest.mock('@/lib/projectPermanentDeleteService', () => ({ permanentlyDeleteProject: jest.fn() }))
jest.mock('@/lib/storageCleanup', () => ({ processStorageCleanupJobs: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { storageCleanupJob: { findMany: jest.fn() } } }))

import { POST } from '@/app/api/admin/projects/bulk-permanent-delete/route'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { permanentlyDeleteProject } from '@/lib/projectPermanentDeleteService'

const mockedAuth = requireAdminSession as jest.MockedFunction<typeof requireAdminSession>
const mockedRateLimit = checkAdminRateLimit as jest.MockedFunction<typeof checkAdminRateLimit>
const mockedDelete = permanentlyDeleteProject as jest.MockedFunction<typeof permanentlyDeleteProject>
const idOne = '00000000-0000-0000-0000-000000000001'
const idTwo = '00000000-0000-0000-0000-000000000002'

function request(body: unknown) {
  return new Request('http://localhost/api/admin/projects/bulk-permanent-delete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('guarded project bulk permanent delete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({ ok: true, userId: 'superadmin-1', role: 'SUPERADMIN' } as any)
    mockedRateLimit.mockResolvedValue({ ok: true, remaining: 10 } as any)
    mockedDelete.mockResolvedValue({ ok: true, project: { id: idOne, slug: 'project-one' }, cleanupJobId: null } as any)
  })

  it('requires a superadmin and exact DELETE confirmation', async () => {
    mockedAuth.mockResolvedValueOnce({ ok: true, userId: 'admin-1', role: 'ADMIN' } as any)
    const forbidden = await POST(request({ ids: [idOne], confirmation: 'DELETE' }))
    expect(forbidden.status).toBe(403)

    const invalid = await POST(request({ ids: [idOne], confirmation: 'delete' }))
    expect(invalid.status).toBe(400)
    expect(mockedDelete).not.toHaveBeenCalled()
  })

  it('deduplicates IDs and delegates each hard delete to the guarded service', async () => {
    const response = await POST(request({ ids: [idOne, idOne], confirmation: 'DELETE' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.successful).toEqual([idOne])
    expect(mockedDelete).toHaveBeenCalledTimes(1)
    expect(mockedDelete).toHaveBeenCalledWith(idOne, 'superadmin-1')
  })

  it('reports projects that are not soft-deleted as per-record failures', async () => {
    mockedDelete.mockResolvedValue({ ok: false, status: 409, message: 'Project must be soft-deleted first.' } as any)

    const response = await POST(request({ ids: [idOne, idTwo], confirmation: 'DELETE' }))
    const json = await response.json()

    expect(response.status).toBe(422)
    expect(json.failed).toEqual([
      { id: idOne, message: 'Project must be soft-deleted first.' },
      { id: idTwo, message: 'Project must be soft-deleted first.' },
    ])
  })
})