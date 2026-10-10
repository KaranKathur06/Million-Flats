/**
 * POST /api/admin/team/members/reorder
 *
 * Bulk reorder of team members. Accepts an ordered array of { id, displayOrder }.
 * Validates all IDs exist before performing any update.
 * Uses a Prisma transaction to ensure consistent ordering.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTeamAdmin, denyTeamResult } from '@/lib/team/auth'
import { writeAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int().min(0).max(9999),
    })
  ).min(1).max(200),
})

export async function POST(req: Request) {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { items } = parsed.data

  try {
    // Validate all IDs exist before making any changes
    const ids = items.map((i) => i.id)
    const existing = await prisma.teamMember.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    if (existing.length !== ids.length) {
      const foundIds = new Set(existing.map((m) => m.id))
      const missingIds = ids.filter((id) => !foundIds.has(id))
      return NextResponse.json(
        { error: 'Some member IDs not found', missing: missingIds },
        { status: 422 },
      )
    }

    // Perform all updates in a single transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.teamMember.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    )

    await writeAuditLog({
      entityType: 'TEAM_MEMBER',
      entityId: 'BULK',
      action: 'TEAM_MEMBER_REORDERED',
      performedByUserId: auth.userId,
      meta: { count: items.length },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
