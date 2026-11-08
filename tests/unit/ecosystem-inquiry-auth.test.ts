import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { ReadableStream } from 'node:stream/web'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
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

import { EcosystemInquiryRequestSchema, handleEcosystemInquiry } from '@/lib/ecosystem/inquiryHttp'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { EcosystemInquiryError, submitEcosystemInquiry } from '@/lib/ecosystem/inquiries'

const authenticatedUser = getAuthenticatedEcosystemUser as jest.MockedFunction<typeof getAuthenticatedEcosystemUser>
const submitInquiry = submitEcosystemInquiry as jest.MockedFunction<typeof submitEcosystemInquiry>

const validPayload = {
  categorySlug: 'home-loans-finance',
  name: 'Test User',
  email: 'different-address@example.com',
  phone: '+91 (123) 456-7890',
  message: 'Please contact me about services.',
  consentToShare: true,
}

function request(
  payload: unknown = validPayload,
  headers: Record<string, string> = {},
  contentType = 'application/json'
) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return {
    url: 'https://millionflats.test/api/ecosystem-partners/leads',
    method: 'POST',
    headers: new Headers({
      'content-type': contentType,
      origin: 'https://millionflats.test',
      'idempotency-key': '4f3312b9-7df0-46c5-94c1-5a9a0f26362e',
      'x-real-ip': '192.0.2.10',
      ...headers,
    }),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body))
        controller.close()
      },
    }),
  } as Request
}

describe('public ecosystem inquiry handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED = 'true'
    process.env.NEXT_PUBLIC_BASE_URL = 'https://millionflats.test'
    delete process.env.NEXTAUTH_URL
    authenticatedUser.mockResolvedValue(null)
    submitInquiry.mockResolvedValue({
      leadId: 'lead-1',
      reused: false,
      notificationStatus: 'sent',
    })
  })

  it('fails closed until the public inquiry feature gate is explicitly enabled', async () => {
    delete process.env.ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED

    const response = await handleEcosystemInquiry(request())

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Inquiry submission is temporarily unavailable.' },
    })
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('creates an anonymous inquiry without requiring an account email', async () => {
    expect(EcosystemInquiryRequestSchema.safeParse(validPayload)).toEqual(expect.objectContaining({ success: true }))
    const response = await handleEcosystemInquiry(request())

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(await response.json()).toEqual({
      success: true,
      leadId: 'lead-1',
      reused: false,
      notificationStatus: 'sent',
    })
    expect(submitInquiry).toHaveBeenCalledWith(expect.objectContaining({
      categorySlug: 'home-loans-finance',
      userId: null,
      sourceIp: '192.0.2.10',
      phone: '+911234567890',
      email: 'different-address@example.com',
      consentVersion: 'ecosystem-inquiry-consent-v1',
    }))
  })

  it('attributes an authenticated verified user without requiring email equality', async () => {
    authenticatedUser.mockResolvedValue({
      id: 'user-1',
      email: 'account@example.com',
      role: 'USER',
    })

    await handleEcosystemInquiry(request())

    expect(submitInquiry).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      email: 'different-address@example.com',
    }))
  })

  it('rejects unsupported content types and oversized raw request bodies', async () => {
    const unsupported = await handleEcosystemInquiry(request(validPayload, {}, 'text/plain'))
    const missingContentType = await handleEcosystemInquiry(request(validPayload, {}, ''))
    expect(unsupported.status).toBe(415)
    expect(missingContentType.status).toBe(415)
    expect((await unsupported.json() as { error: { code: string } }).error.code).toBe('UNSUPPORTED_MEDIA_TYPE')

    const oversized = await handleEcosystemInquiry(
      request(' '.repeat(16 * 1024 + 1), { 'content-length': '1' })
    )
    expect(oversized.status).toBe(413)
    expect((await oversized.json() as { error: { code: string } }).error.code).toBe('PAYLOAD_TOO_LARGE')
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('accepts JSON with UTF-8 charset and rejects unsupported parameters', async () => {
    const accepted = await handleEcosystemInquiry(request(validPayload, {}, 'application/json; charset=utf-8'))
    expect(accepted.status).toBe(201)

    const rejected = await handleEcosystemInquiry(request(validPayload, {}, 'application/json; charset=iso-8859-1'))
    expect(rejected.status).toBe(415)
  })

  it('rejects missing, opaque, malformed, and mismatched origins', async () => {
    const missing = await handleEcosystemInquiry(request(validPayload, { origin: '' }))
    const opaque = await handleEcosystemInquiry(request(validPayload, { origin: 'null' }))
    const malformed = await handleEcosystemInquiry(request(validPayload, { origin: 'not-an-origin' }))
    const mismatched = await handleEcosystemInquiry(request(validPayload, { origin: 'https://attacker.example' }))

    for (const response of [missing, opaque, malformed, mismatched]) {
      expect(response.status).toBe(403)
      expect((await response.json() as { error: { code: string } }).error.code).toBe('ORIGIN_NOT_ALLOWED')
    }
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('fails closed when the canonical origin configuration is invalid', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'not-a-url'
    process.env.NEXTAUTH_URL = 'https://millionflats.test'

    const response = await handleEcosystemInquiry(request())

    expect(response.status).toBe(503)
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('rejects unknown fields, a filled honeypot, a missing category, and non-v4 keys', async () => {
    const unknownField = await handleEcosystemInquiry(request({ ...validPayload, utm_source: 'campaign' }))
    const honeypot = await handleEcosystemInquiry(request({ ...validPayload, websiteConfirm: 'filled' }))
    const missingCategory = await handleEcosystemInquiry(request({ ...validPayload, categorySlug: undefined }))
    const invalidKey = await handleEcosystemInquiry(
      request(validPayload, { 'idempotency-key': '4f3312b9-7df0-16c5-94c1-5a9a0f26362e' })
    )

    expect(unknownField.status).toBe(400)
    expect(honeypot.status).toBe(400)
    expect(missingCategory.status).toBe(400)
    expect(invalidKey.status).toBe(400)
    expect((await invalidKey.json() as { error: { code: string } }).error.code).toBe('INVALID_IDEMPOTENCY_KEY')
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('rejects a conflicting category on a profile route', async () => {
    const response = await handleEcosystemInquiry(
      request({ ...validPayload, categorySlug: 'legal-documentation' }),
      { categorySlug: 'home-loans-finance', partnerSlug: 'example-finance' }
    )

    expect(response.status).toBe(400)
    expect(submitInquiry).not.toHaveBeenCalled()
  })

  it('canonicalizes IPv6 before passing it to the inquiry service', async () => {
    await handleEcosystemInquiry(request(validPayload, { 'x-real-ip': '2001:0db8:0:0:0:0:0:1' }))

    expect(submitInquiry).toHaveBeenCalledWith(expect.objectContaining({ sourceIp: '2001:db8::1' }))
  })

  it('fails closed when the trusted source IP is missing or malformed', async () => {
    submitInquiry.mockImplementation(async (input) => {
      if (!input.sourceIp) throw new EcosystemInquiryError('Internal IP details', 503)
      return { leadId: 'lead-1', reused: false, notificationStatus: 'sent' }
    })

    const response = await handleEcosystemInquiry(request(validPayload, { 'x-real-ip': '192.0.2.10, 198.51.100.2' }))

    expect(response.status).toBe(503)
    expect(submitInquiry).toHaveBeenCalledWith(expect.objectContaining({ sourceIp: null }))
  })

  it('returns stable non-echoing error objects for service failures', async () => {
    submitInquiry.mockRejectedValue(new EcosystemInquiryError('Private internal details', 409))

    const response = await handleEcosystemInquiry(request())

    expect(response.status).toBe(409)
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(await response.json()).toEqual({
      error: {
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'This inquiry key cannot be reused for a different request.',
      },
    })
  })
})
