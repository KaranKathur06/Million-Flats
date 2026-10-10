/**
 * PATCH  /api/admin/team/access/[id]   — update access (change isTeamAdmin)
 * DELETE /api/admin/team/access/[id]   — revoke team access
 *
 * Last-admin invariant: cannot revoke the last active team admin.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTeamAdmin, denyTeamResult, countActiveTeamAdmins } from '@/lib/team/auth'
import { writeAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const updateAccessSchema = z.object({
  isTeamAdmin: z.boolean(),
})

// ── PATCH: Update admin flag ──────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  const accessId = params.id
  if (!accessId) return NextResponse.json({ error: 'Missing access ID' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateAccessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  try {
    const existing = await prisma.teamAccess.findUnique({ where: { id: accessId } })
    if (!existing || existing.isRevoked) {
      return NextResponse.json({ error: 'Team access record not found or revoked' }, { status: 404 })
    }

    // Last-admin guard: cannot demote the last admin
    if (!parsed.data.isTeamAdmin && existing.isTeamAdmin) {
      const adminCount = await countActiveTeamAdmins()
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last team administrator. Grant admin rights to another team member first.' },
          { status: 422 },
        )
      }
    }

    const updated = await prisma.teamAccess.update({
      where: { id: accessId },
      data: { isTeamAdmin: parsed.data.isTeamAdmin },
    })

    await writeAuditLog({
      entityType: 'TEAM_ACCESS',
      entityId: accessId,
      action: 'TEAM_ACCESS_GRANTED',
      performedByUserId: auth.userId,
      beforeState: { isTeamAdmin: existing.isTeamAdmin },
      afterState: { isTeamAdmin: updated.isTeamAdmin },
    })

    return NextResponse.json({ access: updated })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── DELETE: Revoke access ─────────────────────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  const accessId = params.id
  if (!accessId) return NextResponse.json({ error: 'Missing access ID' }, { status: 400 })

  // Optional revocation note from request body
  let revokedNote: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    if (typeof (body as any).note === 'string') {
      revokedNote = (body as any).note.trim().slice(0, 500) || null
    }
  } catch { /* note is optional */ }

  try {
    const existing = await prisma.teamAccess.findUnique({ where: { id: accessId } })
    if (!existing) {
      return NextResponse.json({ error: 'Team access record not found' }, { status: 404 })
    }
    if (existing.isRevoked) {
      return NextResponse.json({ error: 'Team access already revoked' }, { status: 409 })
    }

    // Last-admin guard
    if (existing.isTeamAdmin) {
      const adminCount = await countActiveTeamAdmins()
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot revoke the last team administrator. Grant admin rights to another team member first.' },
          { status: 422 },
        )
      }
    }

    const revoked = await prisma.teamAccess.update({
      where: { id: accessId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedNote,
      },
    })

    await writeAuditLog({
      entityType: 'TEAM_ACCESS',
      entityId: accessId,
      action: 'TEAM_ACCESS_REVOKED',
      performedByUserId: auth.userId,
      beforeState: { isRevoked: false, isTeamAdmin: existing.isTeamAdmin },
      afterState: { isRevoked: true, revokedAt: revoked.revokedAt },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
