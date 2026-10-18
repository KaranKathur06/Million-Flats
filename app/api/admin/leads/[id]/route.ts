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
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
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
      property: { select: { id: true, title: true } },
      agent: { select: { id: true, status: true, user: { select: { name: true } } } },
      activities: { orderBy: { createdAt: 'asc' }, select: { id: true, type: true, summary: true, createdAt: true } },
      notes: { orderBy: { createdAt: 'asc' }, select: { id: true, authorId: true, text: true, createdAt: true } },
      followUps: { orderBy: { scheduledAt: 'asc' }, select: { id: true, action: true, scheduledAt: true, assignedTo: true, notes: true, completedAt: true } },
    },
  })

  if (!lead) return bad('Not found', 404)

  return NextResponse.json({
    success: true,
    lead: mapLeadForDisplay(lead),
    archived: Boolean(lead.deletedAt),
    readOnly: Boolean(lead.deletedAt),
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
    select: { id: true, leadType: true, status: true, sourceId: true, legacyId: true, assignedTo: true, deletedAt: true },
  })
  if (!current) return bad('Not found', 404)
  if (current.deletedAt) return bad('Archived leads must be restored before they can be edited.', 409)

  if (parsed.data.status) {
    const allowed = statusesForLeadType(current.leadType)
    if (!allowed.includes(parsed.data.status)) {
      return bad(`Invalid status for ${current.leadType}`, 400)
    }
  }

  const data: { status?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; assignedTo?: string | null } = {}
  if (parsed.data.status) data.status = parsed.data.status
  if (parsed.data.priority) data.priority = parsed.data.priority
  if (parsed.data.assignedTo !== undefined) data.assignedTo = parsed.data.assignedTo

  const updated = await prisma.lead.updateMany({
    where: { id, deletedAt: null },
    data,
  })
  if (updated.count !== 1) return bad('Archived leads must be restored before they can be edited.', 409)

  if (parsed.data.status && parsed.data.status !== current.status) {
    await prisma.leadActivity.create({
      data: {
        leadId: id,
        type: 'STATUS_CHANGED',
        summary: `Status changed from ${current.status} to ${parsed.data.status}`,
        metadata: { from: current.status, to: parsed.data.status },
        actorId: auth.userId,
      },
    })
  }
  if (parsed.data.assignedTo !== undefined && parsed.data.assignedTo !== current.assignedTo) {
    await prisma.leadActivity.create({
      data: {
        leadId: id,
        type: 'ASSIGNED',
        summary: parsed.data.assignedTo ? 'Lead assigned' : 'Lead unassigned',
        metadata: { assignedTo: parsed.data.assignedTo },
        actorId: auth.userId,
      },
    })
  }

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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }
  if (!['ADMIN', 'SUPERADMIN'].includes(String(auth.role).toUpperCase())) {
    return bad('Forbidden', 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = z.object({ confirmation: z.literal('PERMANENTLY_DELETE_LEAD') }).safeParse(body)
  if (!parsed.success) return bad('Explicit permanent-delete confirmation is required.', 400)

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  try {
    const limit = await checkAdminRateLimit({
      performedByUserId: auth.userId,
      action: 'LEAD_PERMANENTLY_DELETED',
      windowMs: 60_000,
      max: 10,
    })
    if (!limit.ok) return bad('Too many permanent-delete requests.', 429)
  } catch (error) {
    console.error('[admin/leads/delete] Rate-limit check failed', { leadId: id, error })
    return bad('Unable to verify request limit.', 503)
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const db = tx as any
      const lead = await db.lead.findUnique({
        where: { id },
        select: { id: true },
      })
      if (!lead) return false

      await db.leadActivity.deleteMany({ where: { leadId: id } })
      await db.leadNote.deleteMany({ where: { leadId: id } })
      await db.leadFollowUp.deleteMany({ where: { leadId: id } })
      await db.auditLog.create({
        data: {
          entityType: 'LEAD',
          entityId: id,
          action: 'LEAD_PERMANENTLY_DELETED',
          performedByUserId: auth.userId,
          beforeState: { exists: true },
          afterState: { exists: false },
        },
      })
      await db.lead.delete({ where: { id } })
      return true
    })

    if (!deleted) return bad('Not found', 404)
    return NextResponse.json({ success: true, deleted: true })
  } catch (error) {
    console.error('[admin/leads/delete] Permanent deletion failed', { leadId: id, error })
    return bad('Unable to permanently delete lead.', 500)
  }
}
