/**
 * PATCH /api/admin/team/members/[id]   — update a team member profile
 * DELETE /api/admin/team/members/[id]  — delete a team member profile
 *
 * Deletion removes only the TeamMember profile record.
 * It does NOT delete the underlying user account or TeamAccess record.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTeamAdmin, denyTeamResult } from '@/lib/team/auth'
import { writeAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// ── Validation schema ─────────────────────────────────────────────────────────

const updateMemberSchema = z.object({
  displayName: z.string().min(1).max(120).trim().optional(),
  designation: z.string().max(200).trim().optional().nullable(),
  bio: z.string().max(2000).trim().optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  linkedinUrl: z.string().url().max(500).optional().nullable(),
  location: z.string().max(100).trim().optional().nullable(),
  displayOrder: z.number().int().min(0).max(9999).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).optional(),
})

// ── PATCH: Update profile ─────────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  const memberId = params.id
  if (!memberId) return NextResponse.json({ error: 'Missing member ID' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  try {
    const existing = await prisma.teamMember.findUnique({
      where: { id: memberId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    const data = parsed.data

    // Determine audit action
    let auditAction: 'TEAM_MEMBER_UPDATED' | 'TEAM_MEMBER_ACTIVATED' | 'TEAM_MEMBER_DEACTIVATED' = 'TEAM_MEMBER_UPDATED'
    if (data.status === 'ACTIVE' && existing.status !== 'ACTIVE') auditAction = 'TEAM_MEMBER_ACTIVATED'
    else if (data.status === 'INACTIVE' && existing.status !== 'INACTIVE') auditAction = 'TEAM_MEMBER_DEACTIVATED'

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.designation !== undefined && { designation: data.designation }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })

    await writeAuditLog({
      entityType: 'TEAM_MEMBER',
      entityId: memberId,
      action: auditAction,
      performedByUserId: auth.userId,
      beforeState: { status: existing.status },
      afterState: { status: updated.status, displayName: updated.displayName },
    })

    return NextResponse.json({ member: updated })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── DELETE: Remove profile ────────────────────────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  const memberId = params.id
  if (!memberId) return NextResponse.json({ error: 'Missing member ID' }, { status: 400 })

  try {
    const existing = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: { id: true, displayName: true, userId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Delete profile only — does NOT cascade to user account or TeamAccess
    await prisma.teamMember.delete({ where: { id: memberId } })

    await writeAuditLog({
      entityType: 'TEAM_MEMBER',
      entityId: memberId,
      action: 'TEAM_MEMBER_DELETED',
      performedByUserId: auth.userId,
      beforeState: { displayName: existing.displayName, linkedUserId: existing.userId },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
