import { Prisma } from '@prisma/client'
import { fetchRazorpayOrder, fetchRazorpayPayment, verifyPaymentSignature } from '@/lib/razorpay'
import { prisma } from '@/lib/prisma'
import { writeVideoAudit } from '@/lib/videoReels/audit'

export class VideoPaymentVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VideoPaymentVerificationError'
  }
}

type CapturedPaymentInput = {
  id: string
  order_id: string
  amount: number
  currency: string
  status: string
  captured: boolean
}

function isCaptured(payment: CapturedPaymentInput) {
  return payment.status === 'captured' && payment.captured === true
}

export async function captureVideoCampaignOrder(params: {
  razorpayOrderId: string
  payment: CapturedPaymentInput
  signature?: string
  actorUserId?: string | null
}) {
  const order = await prisma.videoCampaignOrder.findUnique({
    where: { razorpayOrderId: params.razorpayOrderId },
    include: { campaign: true },
  })
  if (!order) return null

  if (
    params.payment.order_id !== order.razorpayOrderId
    || !isCaptured(params.payment)
    || params.payment.amount !== order.totalAmount
    || params.payment.currency !== order.currency
  ) {
    throw new VideoPaymentVerificationError('Captured campaign payment does not match the stored order')
  }

  return prisma.$transaction(async (tx) => {
    const currentOrder = await tx.videoCampaignOrder.findUnique({
      where: { id: order.id },
      include: { campaign: true },
    })
    if (!currentOrder) throw new VideoPaymentVerificationError('Campaign order no longer exists')
    if (currentOrder.status === 'CAPTURED') {
      if (currentOrder.razorpayPaymentId !== params.payment.id) {
        throw new VideoPaymentVerificationError('Campaign order was captured by a different payment')
      }
      return currentOrder
    }
    if (currentOrder.status !== 'CREATED') {
      throw new VideoPaymentVerificationError('Campaign order is not ready for capture')
    }

    const now = new Date()
    const updated = await tx.videoCampaignOrder.updateMany({
      where: { id: currentOrder.id, status: 'CREATED', razorpayPaymentId: null },
      data: {
        status: 'CAPTURED',
        razorpayPaymentId: params.payment.id,
        razorpaySignature: params.signature,
        paidAt: now,
        lastFailure: null,
      },
    })
    if (updated.count !== 1) {
      const alreadyCaptured = await tx.videoCampaignOrder.findUnique({ where: { id: currentOrder.id } })
      if (alreadyCaptured?.status === 'CAPTURED' && alreadyCaptured.razorpayPaymentId === params.payment.id) {
        return alreadyCaptured
      }
      throw new VideoPaymentVerificationError('Campaign order capture conflicted with another payment')
    }

    const campaign = currentOrder.campaign
    let nextStatus = campaign.status
    if (campaign.status === 'APPROVED_AWAITING_PAYMENT') {
      if (!campaign.approvedStartAt || !campaign.approvedEndAt) {
        throw new VideoPaymentVerificationError('Approved campaign schedule is incomplete')
      }
      nextStatus = now < campaign.approvedStartAt
        ? 'SCHEDULED'
        : now < campaign.approvedEndAt
          ? 'ACTIVE'
          : 'COMPLETED'
      await tx.videoCampaign.update({
        where: { id: campaign.id },
        data: { status: nextStatus },
      })
    }

    await writeVideoAudit(tx, {
      actorUserId: params.actorUserId || null,
      entityType: 'CAMPAIGN',
      entityId: campaign.id,
      action: 'PAYMENT_CAPTURED',
      beforeState: { orderStatus: currentOrder.status, campaignStatus: campaign.status },
      afterState: { orderStatus: 'CAPTURED', campaignStatus: nextStatus },
    })
    return tx.videoCampaignOrder.findUniqueOrThrow({ where: { id: currentOrder.id } })
  }, { isolationLevel: 'Serializable' })
}

export async function recordVideoCampaignPaymentFailure(razorpayOrderId: string) {
  const order = await prisma.videoCampaignOrder.findUnique({ where: { razorpayOrderId } })
  if (!order || order.status !== 'CREATED') return null
  return prisma.videoCampaignOrder.update({
    where: { id: order.id },
    data: { lastFailure: 'PAYMENT_ATTEMPT_FAILED' },
  })
}

export async function refundVideoCampaignOrder(paymentId: string) {
  const order = await prisma.videoCampaignOrder.findUnique({
    where: { razorpayPaymentId: paymentId },
    include: { campaign: true },
  })
  if (!order) return null

  return prisma.$transaction(async (tx) => {
    await tx.videoCampaignOrder.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' },
    })
    if (['ACTIVE', 'SCHEDULED', 'PAUSED'].includes(order.campaign.status)) {
      await tx.videoCampaign.update({
        where: { id: order.campaignId },
        data: { status: 'CANCELLED' },
      })
    }
    return order
  })
}

export async function verifyAndCaptureVideoPayment(params: {
  campaignId: string
  userId: string
  orderId: string
  paymentId: string
  signature: string
}) {
  const order = await prisma.videoCampaignOrder.findUnique({
    where: { campaignId: params.campaignId },
    include: { campaign: true },
  })
  if (!order || order.purchaserUserId !== params.userId) {
    throw new VideoPaymentVerificationError('Campaign order not found')
  }
  if (order.razorpayOrderId !== params.orderId || !verifyPaymentSignature({
    orderId: params.orderId,
    paymentId: params.paymentId,
    signature: params.signature,
  })) {
    throw new VideoPaymentVerificationError('Payment signature is invalid')
  }

  const [providerOrder, providerPayment] = await Promise.all([
    fetchRazorpayOrder(params.orderId),
    fetchRazorpayPayment(params.paymentId),
  ])
  if (
    providerOrder.id !== order.razorpayOrderId
    || providerOrder.amount !== order.totalAmount
    || providerOrder.currency !== order.currency
    || providerPayment.order_id !== order.razorpayOrderId
    || providerPayment.amount !== order.totalAmount
    || providerPayment.currency !== order.currency
    || !isCaptured(providerPayment)
  ) {
    throw new VideoPaymentVerificationError('Provider payment does not match the campaign order')
  }

  return captureVideoCampaignOrder({
    razorpayOrderId: order.razorpayOrderId,
    payment: providerPayment,
    signature: params.signature,
    actorUserId: params.userId,
  })
}

export function isVideoPaymentDuplicate(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
