import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    authSettings: {
      findUnique: jest.fn(),
    },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  getAiInformationLoginRequired,
  requireAiInformationPageAccess,
  resolveAiLoginRequired,
} from '@/lib/auth/ai-login-policy'

const findUnique = jest.mocked(prisma.authSettings.findUnique)
const getSession = jest.mocked(getServerSession)
const redirectTo = jest.mocked(redirect)

describe('AI information page login policy', () => {
  let consoleError: jest.SpiedFunction<typeof console.error>

  beforeEach(() => {
    jest.clearAllMocks()
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('uses the boolean value and fails closed for invalid values', () => {
    expect(resolveAiLoginRequired(true)).toBe(true)
    expect(resolveAiLoginRequired(false)).toBe(false)
    expect(resolveAiLoginRequired(undefined)).toBe(true)
    expect(resolveAiLoginRequired(null)).toBe(true)
    expect(resolveAiLoginRequired('false')).toBe(true)
  })

  it('requires login when the settings row is missing', async () => {
    findUnique.mockResolvedValue(null)
    await expect(getAiInformationLoginRequired()).resolves.toBe(true)
  })

  it('returns the saved boolean policy', async () => {
    findUnique.mockResolvedValue({
      aiInformationLoginRequired: false,
    } as never)
    await expect(getAiInformationLoginRequired()).resolves.toBe(false)
  })

  it('requires login when the database query fails', async () => {
    findUnique.mockRejectedValue(new Error('database unavailable'))
    await expect(getAiInformationLoginRequired()).resolves.toBe(true)
    expect(consoleError).toHaveBeenCalled()
  })

  it('redirects anonymous visitors and preserves route query values', async () => {
    findUnique.mockResolvedValue({
      aiInformationLoginRequired: true,
    } as never)
    getSession.mockResolvedValue(null)

    await requireAiInformationPageAccess('/ai/view', {
      campaign: 'spring offer',
      tag: ['one', 'two'],
    })

    expect(redirectTo).toHaveBeenCalledWith(
      '/auth/login?next=%2Fai%2Fview%3Fcampaign%3Dspring%2Boffer%26tag%3Done%26tag%3Dtwo',
    )
  })

  it('allows anonymous visitors when login is disabled', async () => {
    findUnique.mockResolvedValue({
      aiInformationLoginRequired: false,
    } as never)

    await requireAiInformationPageAccess('/ai/pro')

    expect(getSession).not.toHaveBeenCalled()
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it('allows authenticated visitors when login is required', async () => {
    findUnique.mockResolvedValue({
      aiInformationLoginRequired: true,
    } as never)
    getSession.mockResolvedValue({ user: { id: 'user-id' } } as never)

    await requireAiInformationPageAccess('/ai-system')

    expect(redirectTo).not.toHaveBeenCalled()
  })

  it('does not query the policy for unrelated routes', async () => {
    await requireAiInformationPageAccess('/api/ai/investment')

    expect(findUnique).not.toHaveBeenCalled()
    expect(getSession).not.toHaveBeenCalled()
  })
})
