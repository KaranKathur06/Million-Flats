/** @jest-environment node */

import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockGetServerSession = jest.fn<(...args: any[]) => Promise<any>>()
const mockUserFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderFindFirst = jest.fn<(...args: any[]) => Promise<any>>()
const mockFetchRazorpayOrder = jest.fn<(...args: any[]) => Promise<any>>()
const mockFetchRazorpayPayment = jest.fn<(...args: any[]) => Promise<any>>()
const mockIsRazorpayConfigured = jest.fn<(...args: any[]) => boolean>()
const mockVerifyPaymentSignature = jest.fn<(...args: any[]) => boolean>()
const mockActivatePassportOrder = jest.fn<(...args: any[]) => Promise<any>>()

jest.mock('next-auth', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: any[]) => mockUserFindUnique(...args) },
    passportOrder: { findFirst: (...args: any[]) => mockOrderFindFirst(...args) },
  },
}))
jest.mock('@/lib/razorpay', () => ({
  fetchRazorpayOrder: (...args: any[]) => mockFetchRazorpayOrder(...args),
  fetchRazorpayPayment: (...args: any[]) => mockFetchRazorpayPayment(...args),
  isRazorpayConfigured: (...args: any[]) => mockIsRazorpayConfigured(...args),
  verifyPaymentSignature: (...args: any[]) => mockVerifyPaymentSignature(...args),
}))
jest.mock('@/lib/passportPayments', () => ({
  activatePassportOrder: (...args: any[]) => mockActivatePassportOrder(...args),
}))

import { POST } from '@/app/api/passport/checkout/verify/route'

const body = {
  razorpay_order_id: 'rzp-order-1',
  razorpay_payment_id: 'rzp-payment-1',
  razorpay_signature: 'signature',
  passportOrderId: '00000000-0000-4000-8000-000000000001',
}

function request(payload = body) {
  return new Request('http://localhost/api/passport/checkout/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

describe('Passport checkout verification API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({ user: { email: 'member@example.com' } })
    mockIsRazorpayConfigured.mockReturnValue(true)
    mockUserFindUnique.mockResolvedValue({ id: 'user-1' })
    mockOrderFindFirst.mockResolvedValue({
      id: body.passportOrderId,
      userId: 'user-1',
      amount: 499900,
      currency: 'INR',
      status: 'PENDING',
      razorpayOrderId: body.razorpay_order_id,
    })
    mockVerifyPaymentSignature.mockReturnValue(true)
    mockFetchRazorpayOrder.mockResolvedValue({
      id: body.razorpay_order_id,
      amount: 499900,
      currency: 'INR',
    })
    mockFetchRazorpayPayment.mockResolvedValue({
      id: body.razorpay_payment_id,
      order_id: body.razorpay_order_id,
      amount: 499900,
      currency: 'INR',
      status: 'captured',
      created_at: 1794096000,
    })
    mockActivatePassportOrder.mockResolvedValue({
      order: { id: body.passportOrderId, status: 'PAID' },
      membership: {
        id: 'membership-1',
        category: 'PROPERTY_BUYERS',
        membershipNumber: 'MFP-1234567890ABCDEF',
        status: 'ACTIVE',
        issueDate: new Date('2026-11-08T00:00:00.000Z'),
        qrCodeValue: 'secure-reference',
      },
    })
  })

  it('requires an authenticated account', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(mockFetchRazorpayPayment).not.toHaveBeenCalled()
  })

  it('rejects invalid signatures before asking the payment provider', async () => {
    mockVerifyPaymentSignature.mockReturnValue(false)

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(mockFetchRazorpayOrder).not.toHaveBeenCalled()
    expect(mockActivatePassportOrder).not.toHaveBeenCalled()
  })

  it('rejects captured payments with a manipulated amount', async () => {
    mockFetchRazorpayPayment.mockResolvedValue({
      id: body.razorpay_payment_id,
      order_id: body.razorpay_order_id,
      amount: 100,
      currency: 'INR',
      status: 'captured',
      created_at: 1794096000,
    })

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(mockActivatePassportOrder).not.toHaveBeenCalled()
  })

  it('activates only after provider confirms the fixed captured amount', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockActivatePassportOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderId: body.passportOrderId,
      razorpayOrderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      amount: 499900,
      currency: 'INR',
    }))
    expect(await response.json()).toMatchObject({ success: true, membership: { status: 'ACTIVE' } })
  })

  it('is idempotent for a payment already verified on this order', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: body.passportOrderId,
      userId: 'user-1',
      amount: 499900,
      currency: 'INR',
      status: 'PAID',
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, alreadyPaid: true })
    expect(mockFetchRazorpayPayment).not.toHaveBeenCalled()
    expect(mockActivatePassportOrder).not.toHaveBeenCalled()
  })
})
