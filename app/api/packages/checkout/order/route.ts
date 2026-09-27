import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay'
import { findPackageById, getPackageTaxRateBps, quotePackage } from '@/lib/packageCatalog'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  packageId: z.string().min(3).max(160),
  idempotencyKey: z.string().uuid(),
  purchaserName: z.string().trim().min(1).max(120),
  purchaserEmail: z.string().trim().email().max(254),
})

function responseForPurchase(purchase: any, reused = true) {
  return {
    success: true,
    purchaseId: purchase.id,
    orderId: purchase.razorpayOrderId,
    amount: purchase.totalAmount,
    currency: purchase.currency,
    keyId: getRazorpayKeyId(),
    purchaserName: purchase.purchaserName,
    purchaserEmail: purchase.purchaserEmail,
    packageName: purchase.packageName,
    reused,
  }
}

export async function POST(req: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ success: false, message: 'Secure checkout is temporarily unavailable.' }, { status: 503 })
  }

  const taxRateBps = getPackageTaxRateBps()
  if (taxRateBps === null) {
    return NextResponse.json({ success: false, message: 'Package tax configuration is not available yet.' }, { status: 503 })
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Enter a valid name and email to continue.' }, { status: 400 })
  }

  const pkg = findPackageById(parsed.data.packageId)
  if (!pkg) {
    return NextResponse.json({ success: false, message: 'This package is no longer available.' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as ({ id?: string; name?: string | null; email?: string | null } | undefined)
  const purchaserEmail = String(sessionUser?.email || parsed.data.purchaserEmail).trim().toLowerCase()
  const purchaserName = String(sessionUser?.name || parsed.data.purchaserName).trim()
  const quote = quotePackage(pkg.pricePaise, taxRateBps)
  const now = new Date()
  const leaseUntil = new Date(now.getTime() + 60_000)
  const db = prisma as any

  let purchase = await db.packagePurchase.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } })
  let ownsLease = false

  if (purchase) {
    if (purchase.packageId !== pkg.id || purchase.purchaserEmail !== purchaserEmail) {
      return NextResponse.json({ success: false, message: 'Checkout session does not match this package or email.' }, { status: 409 })
    }
    if (purchase.status === 'PAID') return NextResponse.json({ ...responseForPurchase(purchase), alreadyPaid: true })
    if (purchase.razorpayOrderId) return NextResponse.json(responseForPurchase(purchase))
    if (purchase.orderLeaseUntil && purchase.orderLeaseUntil > now) {
      return NextResponse.json({ success: false, code: 'ORDER_CREATING', message: 'Checkout is being prepared. Please retry in a moment.' }, { status: 409 })
    }

    const lease = await db.packagePurchase.updateMany({
      where: {
        id: purchase.id,
        status: 'PENDING',
        razorpayOrderId: null,
        OR: [{ orderLeaseUntil: null }, { orderLeaseUntil: { lte: now } }],
      },
      data: { orderLeaseUntil: leaseUntil },
    })
    if (lease.count !== 1) {
      return NextResponse.json({ success: false, code: 'ORDER_CREATING', message: 'Checkout is being prepared. Please retry in a moment.' }, { status: 409 })
    }
    ownsLease = true
  } else {
    try {
      purchase = await db.packagePurchase.create({
        data: {
          packageId: pkg.id,
          packageName: pkg.name,
          audience: pkg.audience,
          purchaserName,
          purchaserEmail,
          userId: sessionUser?.id || null,
          price: quote.pricePaise,
          taxAmount: quote.taxAmountPaise,
          totalAmount: quote.totalAmountPaise,
          taxRateBps,
          currency: pkg.currency,
          idempotencyKey: parsed.data.idempotencyKey,
          orderLeaseUntil: leaseUntil,
          notes: { taxNote: pkg.taxNote },
        },
      })
      ownsLease = true
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')) throw error
      purchase = await db.packagePurchase.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } })
      if (purchase?.razorpayOrderId) return NextResponse.json(responseForPurchase(purchase))
      return NextResponse.json({ success: false, code: 'ORDER_CREATING', message: 'Checkout is being prepared. Please retry in a moment.' }, { status: 409 })
    }
  }

  if (!purchase || !ownsLease) {
    return NextResponse.json({ success: false, message: 'Unable to prepare checkout.' }, { status: 500 })
  }

  try {
    const order = await createRazorpayOrder({
      amount: purchase.totalAmount,
      currency: purchase.currency,
      receipt: `MF_${purchase.id.replace(/-/g, '').slice(0, 24)}`,
      notes: {
        package_purchase_id: purchase.id,
        package_id: pkg.id,
        audience: pkg.audience,
      },
    })
    const finalizedPurchase = await db.packagePurchase.update({
      where: { id: purchase.id },
      data: { razorpayOrderId: order.id, orderLeaseUntil: null },
    })
    return NextResponse.json({
      ...responseForPurchase(finalizedPurchase, false),
      amount: order.amount,
      currency: order.currency,
    })
  } catch (error) {
    await db.packagePurchase.updateMany({
      where: { id: purchase.id, razorpayOrderId: null },
      data: { orderLeaseUntil: new Date(0) },
    }).catch(() => undefined)
    console.error('[POST /api/packages/checkout/order]', error)
    return NextResponse.json({ success: false, message: 'Could not create secure checkout. Please retry.' }, { status: 502 })
  }
}