jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({ authOptions: {} }))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    country: { findUnique: jest.fn() },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/onboarding', () => ({
  calculateProfileCompletion: jest.fn(() => 50),
  ONBOARDING_CURRENT_VERSION: 1,
}))

jest.mock('@/lib/crmSync', () => ({
  syncUserToCRM: jest.fn(),
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { calculateProfileCompletion } from '@/lib/onboarding'
import { syncUserToCRM } from '@/lib/crmSync'
import { normalizeOnboardingCountryIso2 } from '@/lib/auth/onboardingCountry'
import { PATCH } from '@/app/api/user/onboarding/route'

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockedCalculateProfileCompletion = calculateProfileCompletion as jest.MockedFunction<typeof calculateProfileCompletion>
const db = prisma as any

function patchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/user/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('onboarding country normalization', () => {
  it.each([
    ['AE', { kind: 'value', iso2: 'AE' }],
    ['IN', { kind: 'value', iso2: 'IN' }],
    ['GB', { kind: 'value', iso2: 'GB' }],
    ['US', { kind: 'value', iso2: 'US' }],
    [' uk ', { kind: 'value', iso2: 'GB' }],
    ['  ', { kind: 'empty' }],
    [undefined, { kind: 'omitted' }],
    ['USA', { kind: 'invalid' }],
    [123, { kind: 'invalid' }],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeOnboardingCountryIso2(input)).toEqual(expected)
  })
})

describe('user onboarding country persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetServerSession.mockResolvedValue({ user: { email: 'buyer@example.com' } } as any)
    db.user.findUnique.mockResolvedValue({ email: 'buyer@example.com', countryIso2: null })
    db.user.update.mockResolvedValue({ currentOnboardingStep: 1 })
  })

  it('converts legacy UK input to GB and verifies the country row before updating', async () => {
    db.country.findUnique.mockResolvedValue({ iso2: 'GB' })

    const response = await PATCH(patchRequest({ country: ' uk ' }))

    expect(response.status).toBe(200)
    expect(db.country.findUnique).toHaveBeenCalledWith({
      where: { iso2: 'GB' },
      select: { iso2: true },
    })
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ countryIso2: 'GB' }),
    }))
  })

  it('stores an empty country selection as null', async () => {
    const response = await PATCH(patchRequest({ country: '  ' }))

    expect(response.status).toBe(200)
    expect(db.country.findUnique).not.toHaveBeenCalled()
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ countryIso2: null }),
    }))
  })

  it('rejects malformed country values without writing any onboarding fields', async () => {
    const response = await PATCH(patchRequest({ country: 'USA', city: 'Dubai' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      success: false,
      error: 'INVALID_COUNTRY',
      message: 'Country must be a two-letter ISO-2 code.',
    })
    expect(db.country.findUnique).not.toHaveBeenCalled()
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('returns a service error without a partial update when the country row is missing', async () => {
    db.country.findUnique.mockResolvedValue(null)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const response = await PATCH(patchRequest({ country: 'GB', city: 'Dubai' }))

      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({
        success: false,
        error: 'COUNTRY_NOT_AVAILABLE',
        message: 'Country is temporarily unavailable. Please try again later.',
      })
      expect(db.user.update).not.toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('maps a country foreign-key race to the same service error', async () => {
    db.country.findUnique.mockResolvedValue({ iso2: 'GB' })
    db.user.update.mockRejectedValue({ code: 'P2003' })
    mockedCalculateProfileCompletion.mockReturnValueOnce(100)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.useFakeTimers()

    try {
      const response = await PATCH(patchRequest({ country: 'GB', city: 'Dubai' }))

      expect(response.status).toBe(503)
      expect(await response.json()).toMatchObject({
        success: false,
        error: 'COUNTRY_NOT_AVAILABLE',
      })
      jest.runOnlyPendingTimers()
      expect(syncUserToCRM).not.toHaveBeenCalled()
    } finally {
      jest.useRealTimers()
      errorSpy.mockRestore()
    }
  })

  it('does not treat market-interest preferences as country foreign keys', async () => {
    const response = await PATCH(patchRequest({ interestedCountry: 'Both' }))

    expect(response.status).toBe(200)
    expect(db.country.findUnique).not.toHaveBeenCalled()
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ interestedCountry: 'Both' }),
    }))
    expect(db.user.update.mock.calls[0][0].data).not.toHaveProperty('countryIso2')
  })
})
