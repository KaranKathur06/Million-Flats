import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@prisma/client', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ecosystemCategory: { findUnique: jest.fn() },
    ecosystemPartner: { findFirst: jest.fn() },
    lead: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/redis', () => ({
  getRedis: jest.fn(),
}))

jest.mock('@/lib/leads/createLead', () => ({
  ecosystemSlugToCategory: jest.fn(() => 'Ecosystem'),
}))

jest.mock('@/lib/leads/notifications', () => ({
  notifyAdminNewLead: jest.fn(),
}))

jest.mock('@/lib/email/sendEmail', () => ({
  sendEmail: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getRedis } from '@/lib/redis'
import { notifyAdminNewLead } from '@/lib/leads/notifications'
import { sendEmail } from '@/lib/email/sendEmail'
import {
  buildEcosystemInquiryPayloadHash,
  submitEcosystemInquiry,
  type EcosystemInquiryInput,
} from '@/lib/ecosystem/inquiries'

const db = prisma as any
const redis = getRedis as jest.MockedFunction<typeof getRedis>
const notifyAdmin = notifyAdminNewLead as jest.MockedFunction<typeof notifyAdminNewLead>
const email = sendEmail as jest.MockedFunction<typeof sendEmail>
let createdLeadData: Record<string, any>[] = []
let rateLimitEvaluation: jest.Mock

const input = (overrides: Partial<EcosystemInquiryInput> = {}): EcosystemInquiryInput => ({
  categorySlug: 'home-loans-finance',
  partnerId: null,
  partnerSlug: null,
  name: '  Jane Doe  ',
  email: ' JANE@EXAMPLE.COM ',
  phone: '+911234567890',
  city: '  Pune ',
  propertyType: null,
  budget: '',
  requirement: '  ',
  message: '  Please contact me.  ',
  consentToShare: true,
  consentVersion: 'ecosystem-inquiry-consent-v1',
  idempotencyKey: '4f3312b9-7df0-46c5-94c1-5a9a0f26362e',
  userId: null,
  sourceIp: '192.0.2.10',
  ...overrides,
})

describe('ecosystem inquiry idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'test'

    const leads: Record<string, any>[] = []
    createdLeadData = []
    rateLimitEvaluation = jest.fn(async () => 1)
    let nextId = 0
    let transactionTail = Promise.resolve()
    const tx = {
      $queryRaw: jest.fn(async () => []),
      lead: {
        findFirst: jest.fn(async ({ where }: { where: Record<string, any> }) => {
          if (where.id) return leads.find((lead) => lead.id === where.id) ?? null
          const requestKey = where.OR?.find((item: any) => item.requestKey)?.requestKey
          const legacyId = where.OR?.find((item: any) => item.legacyId)?.legacyId
          return leads.find((lead) => lead.requestKey === requestKey || lead.legacyId === legacyId) ?? null
        }),
        create: jest.fn(async ({ data }: { data: Record<string, any> }) => {
          createdLeadData.push(data)
          const lead = {
            id: `lead-${++nextId}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            ecosystemPartner: null,
          }
          leads.push(lead)
          return { id: lead.id }
        }),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, any> }) => {
          const lead = leads.find((item) => item.id === where.id)
          if (lead) {
            Object.assign(lead, data)
            lead.updatedAt = new Date()
          }
          return lead
        }),
      },
    }

    db.ecosystemCategory.findUnique.mockResolvedValue({
      id: 'category-1',
      slug: 'home-loans-finance',
      title: 'Home Loans & Finance',
      isActive: true,
    })
    db.ecosystemPartner.findFirst.mockResolvedValue(null)
    db.lead.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, any> }) => {
      const lead = leads.find((item) => item.id === where.id)
      if (lead) Object.assign(lead, data)
      return lead
    })
    db.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => {
      const previous = transactionTail
      let release!: () => void
      transactionTail = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      try {
        return await callback(tx)
      } finally {
        release()
      }
    })
    redis.mockReturnValue({ eval: rateLimitEvaluation } as never)
    notifyAdmin.mockResolvedValue({ ok: true } as never)
    email.mockResolvedValue({ ok: true } as never)
  })

  it('hashes the normalized payload with the specified stable key order', () => {
    const inquiry = input()
    const expected = createHash('sha256')
      .update(JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+911234567890',
        message: 'Please contact me.',
        consentToShare: true,
        consentVersion: 'ecosystem-inquiry-consent-v1',
        categorySlug: 'home-loans-finance',
        partnerId: null,
        city: 'Pune',
        propertyType: null,
        budget: null,
        requirement: null,
        sourceType: 'ECOSYSTEM_PARTNER_INQUIRY',
        sourcePage: '/ecosystem-partners/home-loans-finance',
        userId: null,
      }))
      .digest('hex')

    expect(
      buildEcosystemInquiryPayloadHash(
        inquiry,
        'home-loans-finance',
        null,
        '/ecosystem-partners/home-loans-finance'
      )
    ).toBe(expected)
  })

  it('creates only one CRM lead and sends only one notification for concurrent retries', async () => {
    const inquiry = input()

    const results = await Promise.all([
      submitEcosystemInquiry(inquiry),
      submitEcosystemInquiry(inquiry),
    ])

    expect(createdLeadData).toHaveLength(1)
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
    expect(email).toHaveBeenCalledTimes(1)
    expect(results.map((result) => result.reused).sort()).toEqual([false, true])
    expect(createdLeadData[0]).toEqual(expect.objectContaining({
      userId: null,
      sourceUrl: '/ecosystem-partners/home-loans-finance',
      consentToShare: true,
      metadata: expect.objectContaining({
        consentVersion: 'ecosystem-inquiry-consent-v1',
      }),
    }))
  })

  it('rejects a same-key submission whose normalized payload changed', async () => {
    await submitEcosystemInquiry(input())
    const changedRequest = submitEcosystemInquiry(input({ name: 'A different person' }))

    await expect(changedRequest).rejects.toMatchObject({ name: 'EcosystemInquiryError', status: 409 })
    expect(createdLeadData).toHaveLength(1)
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
  })

  it('rechecks publication eligibility before idempotency and IP processing', async () => {
    db.ecosystemCategory.findUnique.mockResolvedValue({
      id: 'category-1',
      slug: 'home-loans-finance',
      title: 'Home Loans & Finance',
      isActive: false,
    })

    await expect(submitEcosystemInquiry(input({ sourceIp: null }))).rejects.toMatchObject({ status: 404 })
    expect(createdLeadData).toHaveLength(0)
  })

  it('returns a rate-limit error without creating a CRM lead', async () => {
    rateLimitEvaluation.mockResolvedValue(0)

    await expect(submitEcosystemInquiry(input())).rejects.toMatchObject({
      name: 'EcosystemInquiryError',
      status: 429,
    })
    expect(createdLeadData).toHaveLength(0)
    expect(rateLimitEvaluation).toHaveBeenCalledWith(
      expect.any(String),
      2,
      'ecosystem-inquiry:anonymous',
      expect.stringMatching(/^ecosystem-inquiry:ip:/),
      '5',
      '30',
      '900',
      '0'
    )
  })

  it('fails closed when Redis is unavailable', async () => {
    redis.mockReturnValue(null)

    await expect(submitEcosystemInquiry(input())).rejects.toMatchObject({
      name: 'EcosystemInquiryError',
      status: 503,
    })
    expect(createdLeadData).toHaveLength(0)
  })
})
