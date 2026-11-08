/** @jest-environment node */

import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockGetServerSession = jest.fn<(...args: any[]) => Promise<any>>()
const mockUserFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockMembershipFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderCreate = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderUpdate = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockCreateRazorpayOrder = jest.fn<(...args: any[]) => Promise<any>>()
const mockIsRazorpayConfigured = jest.fn<(...args: any[]) => boolean>()
const mockGetRazorpayKeyId = jest.fn<(...args: any[]) => string>()

jest.mock('next-auth', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: any[]) => mockUserFindUnique(...args) },
    passportMembership: { findUnique: (...args: any[]) => mockMembershipFindUnique(...args) },
    passportOrder: {
      findUnique: (...args: any[]) => mockOrderFindUnique(...args),
      create: (...args: any[]) => mockOrderCreate(...args),
      update: (...args: any[]) => mockOrderUpdate(...args),
      updateMany: (...args: any[]) => mockOrderUpdateMany(...args),
    },
  },
}))
jest.mock('@/lib/razorpay', () => ({
  createRazorpayOrder: (...args: any[]) => mockCreateRazorpayOrder(...args),
  getRazorpayKeyId: (...args: any[]) => mockGetRazorpayKeyId(...args),
  isRazorpayConfigured: (...args: any[]) => mockIsRazorpayConfigured(...args),
}))

import { POST } from '@/app/api/passport/checkout/order/route'

function request(body: unknown) {
  return new Request('http://localhost/api/passport/checkout/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Passport checkout order API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsRazorpayConfigured.mockReturnValue(true)
    mockGetRazorpayKeyId.mockReturnValue('rzp_test_key')
    mockGetServerSession.mockResolvedValue({ user: { email: 'member@example.com' } })
    mockUserFindUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Member',
      email: 'member@example.com',
      status: 'ACTIVE',
    })
    mockMembershipFindUnique.mockResolvedValue(null)
    mockOrderFindUnique.mockResolvedValue(null)
  })

  it('requires an authenticated account', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await POST(request({ category: 'PROPERTY_BUYERS' }))

    expect(response.status).toBe(401)
    expect(mockCreateRazorpayOrder).not.toHaveBeenCalled()
  })

  it('rejects a client-submitted amount instead of trusting it', async () => {
    const response = await POST(request({ category: 'PROPERTY_BUYERS', amount: 1 }))

    expect(response.status).toBe(400)
    expect(mockCreateRazorpayOrder).not.toHaveBeenCalled()
    expect(mockOrderCreate).not.toHaveBeenCalled()
  })

  it('creates a Razorpay order for the canonical fixed price', async () => {
    const createdOrder = {
      id: 'passport-order-1',
      userId: 'user-1',
      category: 'PROPERTY_BUYERS',
      amount: 499900,
      currency: 'INR',
      providerReceipt: 'MFP_123',
      razorpayOrderId: null,
    }
    mockOrderCreate.mockResolvedValue(createdOrder)
    mockCreateRazorpayOrder.mockResolvedValue({
      id: 'rzp-order-1',
      amount: 499900,
      currency: 'INR',
    })
    mockOrderUpdate.mockResolvedValue({ ...createdOrder, razorpayOrderId: 'rzp-order-1' })

    const response = await POST(request({ category: 'PROPERTY_BUYERS' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockOrderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 499900, currency: 'INR' }),
    }))
    expect(mockCreateRazorpayOrder).toHaveBeenCalledWith(expect.objectContaining({
      amount: 499900,
      currency: 'INR',
      receipt: 'MFP_123',
    }))
    expect(data).toMatchObject({
      success: true,
      orderId: 'rzp-order-1',
      amount: 499900,
      currency: 'INR',
      keyId: 'rzp_test_key',
    })
  })

  it('reuses an existing pending provider order on a repeated checkout request', async () => {
    mockOrderFindUnique.mockResolvedValue({
      id: 'passport-order-1',
      userId: 'user-1',
      category: 'PROPERTY_BUYERS',
      status: 'PENDING',
      amount: 499900,
      currency: 'INR',
      razorpayOrderId: 'rzp-order-1',
    })

    const response = await POST(request({ category: 'PROPERTY_BUYERS' }))

    expect(response.status).toBe(200)
    expect(mockCreateRazorpayOrder).not.toHaveBeenCalled()
    expect(mockOrderCreate).not.toHaveBeenCalled()
  })
})
