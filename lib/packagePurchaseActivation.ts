import { prisma } from '@/lib/prisma'

export async function activatePackagePurchase(params: {
  purchaseId: string
  paymentId: string
  paidAt: Date
}) {
  const db = prisma as any
  return db.$transaction(async (tx: any) => {
    const purchase = await tx.packagePurchase.findUnique({ where: { id: params.purchaseId } })
    if (!purchase) throw new Error('Package purchase not found')
    if (purchase.status === 'PAID' && purchase.razorpayPaymentId !== params.paymentId) {
      throw new Error('Package purchase was confirmed with a different payment')
    }

    await tx.packagePurchase.updateMany({
      where: { id: purchase.id, status: 'PENDING' },
      data: {
        status: 'PAID',
        razorpayPaymentId: params.paymentId,
        paidAt: params.paidAt,
      },
    })

    const paidPurchase = await tx.packagePurchase.findUnique({ where: { id: purchase.id } })
    if (paidPurchase.status !== 'PAID' || paidPurchase.razorpayPaymentId !== params.paymentId) {
      throw new Error('Package purchase could not be activated')
    }

    const entitlement = await tx.packageEntitlement.upsert({
      where: { purchaseId: purchase.id },
      create: {
        purchaseId: purchase.id,
        packageId: purchase.packageId,
        packageName: purchase.packageName,
        audience: purchase.audience,
        purchaserEmail: purchase.purchaserEmail,
        userId: purchase.userId,
        status: 'ACTIVE',
        activatedAt: paidPurchase.paidAt || params.paidAt,
      },
      update: {
        status: 'ACTIVE',
        userId: purchase.userId,
      },
    })

    return { purchase: paidPurchase, entitlement }
  })
}