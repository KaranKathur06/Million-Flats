import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/ecosystem/auth', () => ({
  getAuthenticatedEcosystemUser: jest.fn(),
}))

jest.mock('@/lib/ecosystem/inquiries', () => {
  class MockEcosystemInquiryError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message)
    }
  }
  return {
    EcosystemInquiryError: MockEcosystemInquiryError,
    submitEcosystemInquiry: jest.fn(),
  }
})

import { handleEcosystemInquiry } from '@/lib/ecosystem/inquiryHttp'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { submitEcosystemInquiry } from '@/lib/ecosystem/inquiries'

const authenticatedUser = getAuthenticatedEcosystemUser as jest.MockedFunction<typeof getAuthenticatedEcosystemUser>
const submitInquiry = submitEcosystemInquiry as jest.MockedFunction<typeof submitEcosystemInquiry>

const validPayload = {
  name: 'Test User',
  email: 'user@example.com',
  phone: '+911234567890',
  message: 'Please contact me about services.',
  consentToShare: true,
}

function request(payload: unknown = validPayload, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/ecosystem-partners/leads', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': '4f3312b9-7df0-46c5-94c1-5a9a0f26362e',
      'x-real-ip': '192.0.2.10',
      ...headers,
    },
    body: JSON.stringify(payload),
  })
}

describe('ecosystem inquiry authorization and request handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    authenticatedUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
    })
    submitInquiry.mockResolvedValue({
      leadId: 'lead-1',
      reused: false,
      notificationStatus: 'sent',
    })
  })

  it('rejects anonymous inquiries before writing a lead', async () => {
    authenticatedUser.mockResolvedValue(null)

    const response = await handleEcosystemInquiry(request({
      ...validPayload,
      categorySlug: 'home-loans-finance',
    }))

    expect(response.status).toBe(401)
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('rejects cross-origin inquiry submissions', async () => {
    const response = await handleEcosystemInquiry(
      request({ ...validPayload, categorySlug: 'home-loans-finance' }, { origin: 'https://attacker.example' })
    )

    expect(response.status).toBe(403)
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('requires consent and the authenticated account email', async () => {
    const noConsent = await handleEcosystemInquiry(
      request({ ...validPayload, categorySlug: 'home-loans-finance', consentToShare: false })
    )
    expect(noConsent.status).toBe(400)

    const otherEmail = await handleEcosystemInquiry(
      request({ ...validPayload, categorySlug: 'home-loans-finance', email: 'other@example.com' })
    )
    expect(otherEmail.status).toBe(400)
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('creates an authenticated inquiry with the provided idempotency key', async () => {
    const response = await handleEcosystemInquiry(
      request({ ...validPayload, categorySlug: 'home-loans-finance' })
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      success: true,
      leadId: 'lead-1',
      notificationStatus: 'sent',
    })
    expect(submitInquiry).toHaveBeenCalledWith(expect.objectContaining({
      categorySlug: 'home-loans-finance',
      userId: 'user-1',
      idempotencyKey: '4f3312b9-7df0-46c5-94c1-5a9a0f26362e',
      consentToShare: true,
    }))
  })
})
