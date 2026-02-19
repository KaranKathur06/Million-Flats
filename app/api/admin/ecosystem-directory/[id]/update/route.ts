import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { writeAuditLog } from '@/lib/audit'

export const runtime = 'nodejs'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

const BodySchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    isVerified: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    subscriptionTier: z.enum(['FREE', 'BOOSTED', 'PREMIUM', 'SPONSORED']).optional(),
    priorityOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Empty update' })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_ECOSYSTEM_PARTNER_STAGE_CHANGED',
    windowMs: 60_000,
    max: 120,
  })
  if (!limit.ok) return bad('Too many requests', 429)

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return bad('Invalid request body', 400)

  const current = await (prisma as any).ecosystemPartner.findFirst({
    where: { id },
    select: { id: true, status: true, isVerified: true, isFeatured: true, subscriptionTier: true, priorityOrder: true },
  })
  if (!current) return bad('Not found', 404)

  const beforeState = {
    status: String(current.status || ''),
    isVerified: Boolean(current.isVerified),
    isFeatured: Boolean(current.isFeatured),
    subscriptionTier: String(current.subscriptionTier || ''),
    priorityOrder: typeof current.priorityOrder === 'number' ? current.priorityOrder : 0,
  }

  const data: any = {}
  if (parsed.data.status) data.status = parsed.data.status
  if (typeof parsed.data.isVerified === 'boolean') data.isVerified = parsed.data.isVerified
  if (typeof parsed.data.isFeatured === 'boolean') data.isFeatured = parsed.data.isFeatured
  if (parsed.data.subscriptionTier) data.subscriptionTier = parsed.data.subscriptionTier
  if (typeof parsed.data.priorityOrder === 'number') data.priorityOrder = parsed.data.priorityOrder

  const updated = await (prisma as any).ecosystemPartner.update({
    where: { id },
    data,
    select: { id: true, status: true, isVerified: true, isFeatured: true, subscriptionTier: true, priorityOrder: true, updatedAt: true },
  })

  await writeAuditLog({
    entityType: 'ECOSYSTEM_PARTNER_APPLICATION',
    entityId: id,
    action: 'ADMIN_ECOSYSTEM_PARTNER_STAGE_CHANGED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState: {
      status: String(updated.status || ''),
      isVerified: Boolean(updated.isVerified),
      isFeatured: Boolean(updated.isFeatured),
      subscriptionTier: String(updated.subscriptionTier || ''),
      priorityOrder: typeof updated.priorityOrder === 'number' ? updated.priorityOrder : 0,
    },
    meta: { actor: 'admin', surface: 'ecosystem_directory' },
  })

  return NextResponse.json({ success: true, partner: updated })
}
