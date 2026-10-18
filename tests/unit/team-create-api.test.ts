import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockCreateMember = jest.fn<() => Promise<any>>()
const mockRequireTeamAdmin = jest.fn<() => Promise<any>>()
const mockWriteAuditLog = jest.fn<() => Promise<any>>()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: { create: mockCreateMember },
    user: { findUnique: jest.fn() },
  },
}))

jest.mock('@/lib/team/auth', () => ({
  requireTeamAdmin: mockRequireTeamAdmin,
  denyTeamResult: jest.fn(),
}))

jest.mock('@/lib/audit', () => ({
  writeAuditLog: mockWriteAuditLog,
}))

import { POST } from '@/app/api/admin/team/members/route'

describe('POST /api/admin/team/members', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireTeamAdmin.mockResolvedValue({ ok: true, userId: 'admin-user' })
    mockCreateMember.mockResolvedValue({
      id: 'member-1',
      displayName: 'Taylor Example',
      status: 'DRAFT',
    })
    mockWriteAuditLog.mockResolvedValue(undefined)
  })

  it('accepts null optional fields sent by the create form', async () => {
    const request = new Request('http://localhost/api/admin/team/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Taylor Example',
        designation: null,
        bio: null,
        imageUrl: null,
        linkedinUrl: null,
        location: null,
        displayOrder: 0,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(mockCreateMember).toHaveBeenCalledWith({
      data: {
        displayName: 'Taylor Example',
        designation: null,
        bio: null,
        imageUrl: null,
        linkedinUrl: null,
        location: null,
        displayOrder: 0,
        userId: null,
        status: 'DRAFT',
      },
    })
  })
})
