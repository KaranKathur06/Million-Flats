import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockTransaction = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockMembershipFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockMembershipCreate = jest.fn<(...args: any[]) => Promise<any>>()
const mockMembershipUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderUpdate = jest.fn<(...args: any[]) => Promise<any>>()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: any[]) => mockTransaction(...args),
    passportOrder: {
      findUnique: (...args: any[]) => mockOrderFindUnique(...args),
    },
  },
}))

import { activatePassportOrder, recordPassportRefund } from '@/lib/passportPayments'

const pendingOrder = {
  id: 'order-1',
  userId: 'user-1',
  category: 'PROPERTY_BUYERS',
  status: 'PENDING',
  amount: 499900,
  amountRefunded: 0,
  currency: 'INR',
  razorpayOrderId: 'rzp-order-1',
  razorpayPaymentId: null,
}

const membership = {
  id: 'membership-1',
  userId: 'user-1',
  category: 'PROPERTY_BUYERS',
  status: 'ACTIVE',
  membershipNumber: 'MFP-1234567890ABCDEF',
  issueDate: new Date('2026-11-08T00:00:00.000Z'),
  qrCodeValue: 'secure-reference',
}

function configureTransaction() {
  const tx = {
    passportOrder: {
      findUnique: mockOrderFindUnique,
      update: mockOrderUpdate,
    },
    passportMembership: {
      findUnique: mockMembershipFindUnique,
      create: mockMembershipCreate,
      updateMany: mockMembershipUpdateMany,
    },
  }
  mockTransaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx))
}

describe('Passport payment lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    configureTransaction()
  })

  it('creates exactly one digital membership after the expected payment is captured', async () => {
    mockOrderFindUnique.mockResolvedValue(pendingOrder)
    mockMembershipFindUnique.mockResolvedValue(null)
    mockMembershipCreate.mockResolvedValue(membership)
    mockOrderUpdate.mockResolvedValue({ ...pendingOrder, status: 'PAID', razorpayPaymentId: 'pay-1' })

    const result = await activatePassportOrder({
      orderId: 'order-1',
      razorpayOrderId: 'rzp-order-1',
      paymentId: 'pay-1',
      signature: 'valid-signature',
      amount: 499900,
      currency: 'INR',
      paidAt: membership.issueDate,
    })

    expect(result.membership).toEqual(membership)
    expect(mockMembershipCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-1',
        category: 'PROPERTY_BUYERS',
        paymentReference: 'pay-1',
        status: 'ACTIVE',
      }),
    }))
    expect(mockOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'order-1' },
      data: expect.objectContaining({ status: 'PAID', razorpayPaymentId: 'pay-1' }),
    }))
  })

  it('does not create another membership when the same payment is verified again', async () => {
    mockOrderFindUnique.mockResolvedValue({ ...pendingOrder, status: 'PAID', razorpayPaymentId: 'pay-1' })
    mockMembershipFindUnique.mockResolvedValue(membership)

    const result = await activatePassportOrder({
      orderId: 'order-1',
      razorpayOrderId: 'rzp-order-1',
      paymentId: 'pay-1',
      amount: 499900,
      currency: 'INR',
      paidAt: membership.issueDate,
    })

    expect(result.membership).toEqual(membership)
    expect(mockMembershipCreate).not.toHaveBeenCalled()
    expect(mockOrderUpdate).not.toHaveBeenCalled()
  })

  it('rejects a different payment against an already-paid Passport order', async () => {
    mockOrderFindUnique.mockResolvedValue({ ...pendingOrder, status: 'PAID', razorpayPaymentId: 'pay-original' })

    await expect(activatePassportOrder({
      orderId: 'order-1',
      razorpayOrderId: 'rzp-order-1',
      paymentId: 'pay-other',
      amount: 499900,
      currency: 'INR',
      paidAt: membership.issueDate,
    })).rejects.toThrow('Passport order was confirmed with a different payment')

    expect(mockMembershipCreate).not.toHaveBeenCalled()
  })

  it('rejects client or provider amount manipulation before membership activation', async () => {
    mockOrderFindUnique.mockResolvedValue(pendingOrder)

    await expect(activatePassportOrder({
      orderId: 'order-1',
      razorpayOrderId: 'rzp-order-1',
      paymentId: 'pay-1',
      amount: 100,
      currency: 'INR',
      paidAt: membership.issueDate,
    })).rejects.toThrow('Passport payment amount or currency does not match the configured price')

    expect(mockMembershipCreate).not.toHaveBeenCalled()
  })

  it('deactivates membership only after a full refund', async () => {
    mockOrderFindUnique.mockResolvedValue({ ...pendingOrder, status: 'PAID', razorpayPaymentId: 'pay-1' })
    mockMembershipUpdateMany.mockResolvedValue({ count: 1 })
    mockOrderUpdate.mockResolvedValue({ ...pendingOrder, status: 'REFUNDED', amountRefunded: 499900 })

    await recordPassportRefund('pay-1', 499900)

    expect(mockMembershipUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', status: 'ACTIVE' },
      data: { status: 'INACTIVE' },
    }))
    expect(mockOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'REFUNDED', amountRefunded: 499900 }),
    }))
  })
})
