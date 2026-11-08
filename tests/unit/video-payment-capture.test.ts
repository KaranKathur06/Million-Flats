import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockFindUnique = jest.fn()
const mockUpdateMany = jest.fn()
const mockUpdate = jest.fn()
const mockTransaction = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    videoCampaignOrder: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      updateMany: (...args: any[]) => mockUpdateMany(...args),
      update: (...args: any[]) => mockUpdate(...args),
      findUniqueOrThrow: jest.fn(),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}))

jest.mock('@/lib/videoReels/audit', () => ({
  writeVideoAudit: jest.fn().mockResolvedValue(undefined),
}))

import { captureVideoCampaignOrder, VideoPaymentVerificationError } from '@/lib/videoReels/payments'

describe('video campaign payment capture', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns an already captured order without reprocessing a duplicate payment', async () => {
    const existing = {
      id: 'order-1',
      status: 'CAPTURED',
      razorpayOrderId: 'order-rzp-1',
      razorpayPaymentId: 'pay-1',
      totalAmount: 50000,
      currency: 'INR',
      campaign: { id: 'campaign-1', status: 'ACTIVE' },
    }
    mockFindUnique.mockResolvedValue(existing)
    mockTransaction.mockImplementation(async (callback: any) => callback({
      videoCampaignOrder: {
        findUnique: jest.fn().mockResolvedValue(existing),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(existing),
      },
    }))

    const result = await captureVideoCampaignOrder({
      razorpayOrderId: 'order-rzp-1',
      payment: { id: 'pay-1', order_id: 'order-rzp-1', amount: 50000, currency: 'INR', status: 'captured', captured: true },
      actorUserId: 'user-1',
    })

    expect(result).toMatchObject({ id: 'order-1', status: 'CAPTURED' })
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it('rejects a captured payment whose amount or currency does not match the stored order', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'order-2',
      razorpayOrderId: 'order-rzp-2',
      totalAmount: 50000,
      currency: 'INR',
      campaign: { id: 'campaign-2', status: 'APPROVED_AWAITING_PAYMENT' },
    })

    await expect(captureVideoCampaignOrder({
      razorpayOrderId: 'order-rzp-2',
      payment: { id: 'pay-2', order_id: 'order-rzp-2', amount: 60000, currency: 'USD', status: 'captured', captured: true },
    })).rejects.toBeInstanceOf(VideoPaymentVerificationError)
  })
})
