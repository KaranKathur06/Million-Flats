jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

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
  prisma: {
    developer: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    agencyProfile: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    ecosystemPartner: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/manualPropertyAdminLifecycle', () => ({
  applyManualPropertyAdminAction: jest.fn(),
}))

jest.mock('@/lib/publicationReadiness', () => ({
  checkProjectPublishReadiness: jest.fn(() => ({ ok: true })),
}))

import { POST } from '@/app/api/admin/bulk-approve/route'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { applyApprovalDefaults } from '@/lib/ecosystem/partnerVisibility'

const mockedAuth = requireAdminSession as jest.MockedFunction<typeof requireAdminSession>
const db = prisma as any

describe('admin bulk approval', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'SUPERADMIN' } as any)
  })

  it('rejects invalid entity requests before touching the database', async () => {
    const response = await POST(new Request('http://localhost/api/admin/bulk-approve', {
      method: 'POST',
      body: JSON.stringify({ entity: 'agents', ids: ['one'] }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(response.status).toBe(400)
    expect(db.developer.findMany).not.toHaveBeenCalled()
  })

  it('activates valid developers and reports deleted or missing records individually', async () => {
    db.developer.findMany.mockResolvedValue([
      { id: 'dev-1', name: 'Ready Developer', slug: 'ready-developer', isDeleted: false },
      { id: 'dev-2', name: 'Deleted Developer', slug: 'deleted-developer', isDeleted: true },
    ])
    db.developer.update.mockResolvedValue({ id: 'dev-1', status: 'ACTIVE' })

    const response = await POST(new Request('http://localhost/api/admin/bulk-approve', {
      method: 'POST',
      body: JSON.stringify({ entity: 'developers', ids: ['dev-1', 'dev-2', 'missing'] }),
      headers: { 'Content-Type': 'application/json' },
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.approved).toEqual(['dev-1'])
    expect(json.failures).toEqual([
      { id: 'dev-2', message: 'Deleted developer cannot be published' },
      { id: 'missing', message: 'Developer not found' },
    ])
    expect(db.developer.update).toHaveBeenCalledWith({ where: { id: 'dev-1' }, data: { status: 'ACTIVE' } })
  })

  it('applies the ecosystem visibility defaults when approving partners', async () => {
    db.ecosystemPartner.findMany.mockResolvedValue([{ id: 'partner-1' }])
    db.ecosystemPartner.update.mockResolvedValue({ id: 'partner-1' })

    await POST(new Request('http://localhost/api/admin/bulk-approve', {
      method: 'POST',
      body: JSON.stringify({ entity: 'ecosystem-partners', ids: ['partner-1'] }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(db.ecosystemPartner.update).toHaveBeenCalledWith({
      where: { id: 'partner-1' },
      data: applyApprovalDefaults({ status: 'APPROVED' }),
    })
  })
})
