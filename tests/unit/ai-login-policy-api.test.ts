import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockGetServerSession = jest.fn()
const mockUserFindUnique = jest.fn()
const mockFindUnique = jest.fn()
const mockUpdateMany = jest.fn()
const mockCreate = jest.fn()
const mockAuditFindFirst = jest.fn()
const mockAuditCreate = jest.fn()
const mockTransaction = jest.fn()

jest.mock('next-auth', () => ({ getServerSession: mockGetServerSession }))
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mockTransaction,
    user: { findUnique: mockUserFindUnique },
    authSettings: { findUnique: mockFindUnique },
  },
}))

import { PATCH } from '@/app/api/admin/settings/ai-login-policy/route'

function makeRequest(
  body: string,
  headers: Record<string, string> = {
    origin: 'http://localhost',
    host: 'localhost',
    'content-type': 'application/json',
  },
) {
  return new Request('http://localhost/api/admin/settings/ai-login-policy', {
    method: 'PATCH',
    headers,
    body,
  })
}

describe('AI login policy update API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({
      user: { id: 'super-admin-id', role: 'SUPERADMIN' },
    })
    mockUserFindUnique.mockResolvedValue({
      id: 'super-admin-id',
      role: 'SUPERADMIN',
    })
    mockFindUnique.mockResolvedValue({
      aiInformationLoginRequired: true,
      aiInformationPolicyVersion: 1,
    })
    mockUpdateMany.mockResolvedValue({ count: 1 })
    mockCreate.mockResolvedValue({})
    mockAuditFindFirst.mockResolvedValue({
      createdAt: new Date('2026-11-01T10:00:00.000Z'),
      performedBy: {
        id: 'super-admin-id',
        name: 'Super Admin',
        email: 'admin@example.test',
      },
      meta: { policyVersion: 2, actorRole: 'SUPERADMIN' },
    })
    mockAuditCreate.mockResolvedValue({})
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        authSettings: {
          findUnique: mockFindUnique,
          updateMany: mockUpdateMany,
          create: mockCreate,
        },
        auditLog: {
          findFirst: mockAuditFindFirst,
          create: mockAuditCreate,
        },
      }),
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rejects unauthenticated direct API requests', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const response = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
    })))

    expect(response.status).toBe(401)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects non-SUPERADMIN updates', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'admin-id', role: 'ADMIN' },
    })
    const response = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
    })))

    expect(response.status).toBe(403)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects stale admin sessions before attempting to write', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const response = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
    })))
    const result = await response.json()

    expect(response.status).toBe(401)
    expect(result.error).toMatch(/session is out of date/i)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('uses the administrator role currently stored in the database', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'super-admin-id',
      role: 'ADMIN',
    })
    const response = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
    })))

    expect(response.status).toBe(403)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects cross-origin updates', async () => {
    const response = await PATCH(makeRequest(
      JSON.stringify({ loginRequired: false, expectedVersion: 1 }),
      { origin: 'https://attacker.example', 'content-type': 'application/json' },
    ))

    expect(response.status).toBe(403)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('accepts same-origin updates behind a reverse proxy', async () => {
    mockFindUnique
      .mockResolvedValueOnce({
        aiInformationLoginRequired: true,
        aiInformationPolicyVersion: 1,
      })
      .mockResolvedValueOnce({
        aiInformationLoginRequired: false,
        aiInformationPolicyVersion: 2,
      })
    const request = new Request(
      'http://internal-service:3000/api/admin/settings/ai-login-policy',
      {
        method: 'PATCH',
        headers: {
          origin: 'https://admin.example.com',
          host: 'internal-service:3000',
          'x-forwarded-host': 'admin.example.com',
          'x-forwarded-proto': 'https',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ loginRequired: false, expectedVersion: 1 }),
      },
    )

    const response = await PATCH(request)

    expect(response.status).toBe(200)
  })

  it('rejects malformed, non-boolean, or unexpected request fields', async () => {
    const malformed = await PATCH(makeRequest('{'))
    const nonBoolean = await PATCH(makeRequest(JSON.stringify({
      loginRequired: 'false',
      expectedVersion: 1,
    })))
    const extraField = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
      updatedBy: 'forged-actor',
    })))

    expect(malformed.status).toBe(400)
    expect(nonBoolean.status).toBe(400)
    expect(extraField.status).toBe(400)
  })

  it('persists and audits a confirmed policy change atomically', async () => {
    mockFindUnique
      .mockResolvedValueOnce({
        aiInformationLoginRequired: true,
        aiInformationPolicyVersion: 1,
      })
      .mockResolvedValueOnce({
        aiInformationLoginRequired: false,
        aiInformationPolicyVersion: 2,
      })
    const response = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
    })))
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'singleton',
          aiInformationPolicyVersion: 1,
        },
        data: expect.objectContaining({
          aiInformationLoginRequired: false,
          aiInformationPolicyVersion: { increment: 1 },
          updatedByUserId: 'super-admin-id',
        }),
      }),
    )
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityId: 'AI_SYSTEM_LOGIN_REQUIRED',
          action: 'AI_LOGIN_POLICY_UPDATED',
          performedByUserId: 'super-admin-id',
          beforeState: { loginRequired: true },
          afterState: { loginRequired: false, policyVersion: 2 },
        }),
      }),
    )
    expect(result.data).toMatchObject({
      loginRequired: false,
      version: 2,
    })
  })

  it('returns a conflict when the concurrent policy update wins', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 })
    const response = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
    })))

    expect(response.status).toBe(409)
    expect(mockAuditCreate).not.toHaveBeenCalled()
  })

  it('does not report success when the audit insert fails', async () => {
    mockFindUnique
      .mockResolvedValueOnce({
        aiInformationLoginRequired: true,
        aiInformationPolicyVersion: 1,
      })
    mockAuditCreate.mockRejectedValue(new Error('audit unavailable'))
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const response = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
    })))

    expect(response.status).toBe(500)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('returns an actionable migration message for a missing policy column', async () => {
    mockTransaction.mockRejectedValue({ code: 'P2022' })
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const response = await PATCH(makeRequest(JSON.stringify({
      loginRequired: false,
      expectedVersion: 1,
    })))
    const result = await response.json()

    expect(response.status).toBe(500)
    expect(result.error).toMatch(/migration is missing/i)
    expect(result.requestId).toBeTruthy()
    consoleError.mockRestore()
  })
})
