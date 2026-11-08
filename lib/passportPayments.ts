import { randomBytes, randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { PASSPORT_CURRENCY, PASSPORT_PRICE_PAISE } from '@/lib/passport'

export async function activatePassportOrder(params: {
  orderId: string
  razorpayOrderId: string
  paymentId: string
  signature?: string | null
  amount: number
  currency: string
  paidAt: Date
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.passportOrder.findUnique({ where: { id: params.orderId } })
    if (!order) throw new Error('Passport order not found')
    if (order.razorpayOrderId !== params.razorpayOrderId) {
      throw new Error('Passport order does not match the payment order')
    }

    if (
      order.amount !== PASSPORT_PRICE_PAISE
      || params.amount !== PASSPORT_PRICE_PAISE
      || order.currency !== PASSPORT_CURRENCY
      || params.currency !== PASSPORT_CURRENCY
    ) {
      throw new Error('Passport payment amount or currency does not match the configured price')
    }

    if (order.status === 'PAID' || order.status === 'REFUNDED') {
      if (order.razorpayPaymentId !== params.paymentId) {
        throw new Error('Passport order was confirmed with a different payment')
      }
      const membership = await tx.passportMembership.findUnique({ where: { userId: order.userId } })
      if (!membership) throw new Error('Processed Passport order is missing its membership')
      return { order, membership }
    }

    if (order.status !== 'PENDING') {
      throw new Error('Passport order is not payable')
    }

    const existingMembership = await tx.passportMembership.findUnique({
      where: { userId: order.userId },
    })
    if (existingMembership) {
      throw new Error('This account already has a MillionFlats Passport')
    }

    const membership = await tx.passportMembership.create({
      data: {
        userId: order.userId,
        category: order.category,
        membershipNumber: `MFP-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
        status: 'ACTIVE',
        issueDate: params.paidAt,
        activatedAt: params.paidAt,
        paymentReference: params.paymentId,
        qrCodeValue: randomBytes(32).toString('hex'),
      },
    })

    const paidOrder = await tx.passportOrder.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        razorpayPaymentId: params.paymentId,
        razorpaySignature: params.signature || undefined,
        paidAt: params.paidAt,
        failureReason: null,
      },
    })

    return { order: paidOrder, membership }
  })
}

export async function recordPassportPaymentFailure(orderId: string, reason: string | null) {
  const order = await prisma.passportOrder.findUnique({ where: { razorpayOrderId: orderId } })
  if (!order || order.status !== 'PENDING') return order

  return prisma.passportOrder.update({
    where: { id: order.id },
    data: { failureReason: reason || 'Payment attempt failed' },
  })
}

export async function recordPassportRefund(paymentId: string, amountRefunded: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.passportOrder.findUnique({ where: { razorpayPaymentId: paymentId } })
    if (!order || order.status === 'REFUNDED') return order
    if (order.status !== 'PAID') throw new Error('Only paid Passport orders can be refunded')

    const totalRefunded = Math.max(order.amountRefunded, amountRefunded)
    const isFullyRefunded = totalRefunded >= order.amount

    if (isFullyRefunded) {
      await tx.passportMembership.updateMany({
        where: { userId: order.userId, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      })
    }

    return tx.passportOrder.update({
      where: { id: order.id },
      data: {
        status: isFullyRefunded ? 'REFUNDED' : 'PAID',
        amountRefunded: totalRefunded,
        refundedAt: isFullyRefunded ? new Date() : null,
      },
    })
  })
}
