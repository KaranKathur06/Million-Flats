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
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/media/resolveMedia', () => ({ resolveProjectMediaUrl: jest.fn() }))

import { GET } from '@/app/api/admin/projects/route'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

const mockedAuth = requireAdminSession as jest.MockedFunction<typeof requireAdminSession>
const projects = (prisma as any).project

describe('admin project draft lifecycle filter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'ADMIN' } as any)
    projects.findMany.mockResolvedValue([])
    projects.count.mockResolvedValue(0)
  })

  it('filters Draft rows and returns an independent exact Draft count', async () => {
    projects.count
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)

    const response = await GET(new Request('http://localhost/api/admin/projects?lifecycle=draft'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(projects.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      where: { isDeleted: false, status: 'DRAFT' },
      take: 500,
    }))
    expect(projects.count).toHaveBeenNthCalledWith(3, { where: { isDeleted: false, status: 'DRAFT' } })
    expect(json.lifecycleStats).toEqual({ total: 25, active: 12, draft: 8, archived: 3, deleted: 2 })
  })

  it('keeps Active rows published-only even when the status filter conflicts', async () => {
    await GET(new Request('http://localhost/api/admin/projects?lifecycle=active&status=DRAFT'))

    expect(projects.findMany.mock.calls[0][0].where).toEqual({
      isDeleted: false,
      status: 'PUBLISHED',
      AND: [{ status: 'DRAFT' }],
    })
  })
})