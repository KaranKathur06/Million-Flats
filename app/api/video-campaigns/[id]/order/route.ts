import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay'
import { requireVideoAdvertiser } from '@/lib/videoReels/auth'
import { getConfiguredVideoCampaignTaxRateBps, isVideoCampaignPaymentsEnabled } from '@/lib/videoReels/config'
import { consumeVideoRateLimit } from '@/lib/videoReels/rateLimit'

const BodySchema = z.object({ idempotencyKey: z.string().uuid() }).strict()

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!isVideoCampaignPaymentsEnabled()) {
    return NextResponse.json({ error: 'Campaign checkout is not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const auth = await requireVideoAdvertiser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } })
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 })
  if (!isRazorpayConfigured()) return NextResponse.json({ error: 'Checkout is temporarily unavailable' }, { status: 503 })

  const taxRateBps = getConfiguredVideoCampaignTaxRateBps()
  if (taxRateBps === null) return NextResponse.json({ error: 'Finance tax configuration is unavailable' }, { status: 503 })

  try {
    const rate = await consumeVideoRateLimit(`checkout:${auth.user.id}`, 10, 60 * 60)
    if (!rate.allowed) return NextResponse.json({ error: 'Checkout request limit reached' }, { status: 429 })

    const campaign = await prisma.videoCampaign.findFirst({
      where: {
        id: params.id,
        ownerUserId: auth.user.id,
        status: 'APPROVED_AWAITING_PAYMENT',
      },
      include: { order: true },
    })
    if (!campaign) return NextResponse.json({ error: 'Approved campaign not found' }, { status: 404 })

    const snapshot = campaign.packageSnapshot
    if (
      typeof snapshot !== 'object'
      || snapshot === null
      || Array.isArray(snapshot)
      || typeof snapshot.amount !== 'number'
      || typeof snapshot.taxRateBps !== 'number'
      || typeof snapshot.currency !== 'string'
      || snapshot.taxRateBps !== taxRateBps
      || snapshot.currency !== 'INR'
    ) {
      return NextResponse.json({ error: 'Campaign pricing configuration is invalid' }, { status: 503 })
    }

    const idempotencyKey = `${auth.user.id}:${parsed.data.idempotencyKey}`
    let order = campaign.order
    if (order) {
      if (order.idempotencyKey !== idempotencyKey) {
        return NextResponse.json({ error: 'A checkout already exists for this campaign' }, { status: 409 })
      }
      if (order.status === 'CREATED' && order.razorpayOrderId) {
        return NextResponse.json({
          orderId: order.razorpayOrderId,
          amount: order.totalAmount,
          currency: order.currency,
          keyId: getRazorpayKeyId(),
        }, { headers: { 'Cache-Control': 'no-store' } })
      }
      if (order.status === 'CAPTURED') {
        return NextResponse.json({ status: 'CAPTURED' }, { headers: { 'Cache-Control': 'no-store' } })
      }
      return NextResponse.json({ error: 'Checkout requires administrative reconciliation' }, { status: 409 })
    }

    const amount = Math.trunc(snapshot.amount)
    if (!Number.isSafeInteger(amount) || amount < 1) {
      return NextResponse.json({ error: 'Campaign price is invalid' }, { status: 503 })
    }
    const taxAmount = Math.round(amount * taxRateBps / 10_000)
    const totalAmount = amount + taxAmount
    const providerReceipt = `MFV_${crypto.randomUUID().replace(/-/g, '')}`

    try {
      order = await prisma.videoCampaignOrder.create({
        data: {
          campaignId: campaign.id,
          purchaserUserId: auth.user.id,
          status: 'CREATING',
          idempotencyKey,
          providerReceipt,
          amount,
          taxAmount,
          totalAmount,
          taxRateBps,
          currency: 'INR',
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.videoCampaignOrder.findUnique({ where: { campaignId: campaign.id } })
        if (existing?.idempotencyKey === idempotencyKey && existing.status === 'CREATED' && existing.razorpayOrderId) {
          return NextResponse.json({
            orderId: existing.razorpayOrderId,
            amount: existing.totalAmount,
            currency: existing.currency,
            keyId: getRazorpayKeyId(),
          }, { headers: { 'Cache-Control': 'no-store' } })
        }
        return NextResponse.json({ error: 'Checkout already exists and requires reconciliation' }, { status: 409 })
      }
      throw error
    }

    try {
      const providerOrder = await createRazorpayOrder({
        amount: totalAmount,
        currency: order.currency,
        receipt: providerReceipt,
        notes: { campaign_id: campaign.id, campaign_order_id: order.id },
      })
      if (
        providerOrder.amount !== order.totalAmount
        || providerOrder.currency !== order.currency
        || providerOrder.receipt !== order.providerReceipt
      ) {
        await prisma.videoCampaignOrder.update({
          where: { id: order.id },
          data: { status: 'FAILED', lastFailure: 'PROVIDER_ORDER_MISMATCH' },
        })
        return NextResponse.json({ error: 'Checkout order could not be verified' }, { status: 502 })
      }
      order = await prisma.videoCampaignOrder.update({
        where: { id: order.id },
        data: { status: 'CREATED', razorpayOrderId: providerOrder.id },
      })
      return NextResponse.json({
        orderId: providerOrder.id,
        amount: order.totalAmount,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
      }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      console.error('Video campaign order creation outcome is unresolved', error)
      try {
        await prisma.videoCampaignOrder.update({
          where: { id: order.id },
          data: { lastFailure: 'PROVIDER_ORDER_CREATE_UNCERTAIN' },
        })
      } catch (updateError) {
        console.error('Unable to persist unresolved video campaign order state', updateError)
      }
      return NextResponse.json({ error: 'Checkout is awaiting reconciliation; do not retry with a new request' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
  } catch (error) {
    console.error('Video campaign checkout failed', error)
    return NextResponse.json({ error: 'Unable to start campaign checkout' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
