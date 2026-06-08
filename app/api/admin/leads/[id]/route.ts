import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { statusesForLeadType } from '@/lib/leads/constants'
import { mapLeadForDisplay } from '@/lib/leads/mapLeadForDisplay'
import { onboardEcosystemLeadToPartner } from '@/lib/leads/ecosystemOnboard'

export const runtime = 'nodejs'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

const PatchSchema = z.object({
  status: z.string().min(1).optional(),
  assignedTo: z.string().nullable().optional(),
  onboard: z.boolean().optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      ecosystemPartner: { select: { id: true, name: true, status: true } },
    },
  })

  if (!lead) return bad('Not found', 404)

  return NextResponse.json({
    success: true,
    lead: mapLeadForDisplay(lead),
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return bad('Invalid request body', 400)

  const current = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, leadType: true, status: true, sourceId: true, legacyId: true },
  })
  if (!current) return bad('Not found', 404)

  if (parsed.data.status) {
    const allowed = statusesForLeadType(current.leadType)
    if (!allowed.includes(parsed.data.status)) {
      return bad(`Invalid status for ${current.leadType}`, 400)
    }
  }

  const data: { status?: string; assignedTo?: string | null } = {}
  if (parsed.data.status) data.status = parsed.data.status
  if (parsed.data.assignedTo !== undefined) data.assignedTo = parsed.data.assignedTo

  const updated = await prisma.lead.update({
    where: { id },
    data,
    select: { id: true, status: true, assignedTo: true, leadType: true, ecosystemPartnerId: true },
  })

  if (current.leadType === 'ECOSYSTEM' && parsed.data.status) {
    const applicationId = current.sourceId || current.legacyId
    const stageMap: Record<string, string> = {
      APPLIED: 'APPLIED',
      UNDER_REVIEW: 'UNDER_REVIEW',
      APPROVED: 'APPROVED',
      ONBOARDED: 'ONBOARDED',
      REJECTED: 'APPLIED',
    }
    const stage = stageMap[parsed.data.status]
    if (applicationId && stage) {
      await prisma.ecosystemPartnerApplication
        .update({ where: { id: applicationId }, data: { stage: stage as any } })
        .catch(() => null)
    }
  }

  const shouldOnboard =
    parsed.data.onboard ||
    parsed.data.status === 'ONBOARDED' ||
    parsed.data.status === 'APPROVED'

  if (shouldOnboard) {
    if (current.leadType === 'ECOSYSTEM') {
      try {
        await onboardEcosystemLeadToPartner(id)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Onboard failed'
        if (parsed.data.onboard) return bad(msg, 400)
      }
    }
  }

  const fresh = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, status: true, assignedTo: true, ecosystemPartnerId: true },
  })

  return NextResponse.json({ success: true, lead: fresh })
}
