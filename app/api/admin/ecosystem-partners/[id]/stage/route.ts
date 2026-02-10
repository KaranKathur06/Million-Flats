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

const BodySchema = z.object({
  stage: z.enum(['APPLIED', 'UNDER_REVIEW', 'APPROVED', 'ONBOARDED']),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_ECOSYSTEM_PARTNER_STAGE_CHANGED',
    windowMs: 60_000,
    max: 60,
  })
  if (!limit.ok) return bad('Too many requests', 429)

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return bad('Invalid request body', 400)

  const current = await (prisma as any).ecosystemPartnerApplication.findFirst({
    where: { id },
    select: { id: true, stage: true, category: true },
  })
  if (!current) return bad('Not found', 404)

  const beforeState = { stage: String(current.stage), category: String(current.category) }

  const updated = await (prisma as any).ecosystemPartnerApplication.update({
    where: { id },
    data: { stage: parsed.data.stage },
    select: { id: true, stage: true, category: true, updatedAt: true },
  })

  await writeAuditLog({
    entityType: 'ECOSYSTEM_PARTNER_APPLICATION',
    entityId: id,
    action: 'ADMIN_ECOSYSTEM_PARTNER_STAGE_CHANGED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState: { stage: String(updated.stage), category: String(updated.category) },
    meta: { actor: 'admin' },
  })

  return NextResponse.json({ success: true, application: updated })
}
