/**
 * GET  /api/admin/team/access   — list all team access grants
 * POST /api/admin/team/access   — grant team access to a user
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTeamAdmin, denyTeamResult } from '@/lib/team/auth'
import { writeAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const grantSchema = z.object({
  userId: z.string().uuid(),
  isTeamAdmin: z.boolean().default(false),
})

// ── GET: List access grants ───────────────────────────────────────────────────

export async function GET() {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  try {
    const grants = await prisma.teamAccess.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        grantedBy: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json({ grants }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── POST: Grant access ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = grantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { userId, isTeamAdmin } = parsed.data

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, status: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Cannot grant team access to a suspended or banned account' }, { status: 422 })
  }

  try {
    // Upsert: if a revoked record exists, restore it; otherwise create fresh
    const access = await prisma.teamAccess.upsert({
      where: { userId },
      update: {
        isRevoked: false,
        isTeamAdmin,
        revokedAt: null,
        revokedNote: null,
        grantedByUserId: auth.userId,
      },
      create: {
        userId,
        isTeamAdmin,
        grantedByUserId: auth.userId,
      },
    })

    await writeAuditLog({
      entityType: 'TEAM_ACCESS',
      entityId: access.id,
      action: 'TEAM_ACCESS_GRANTED',
      performedByUserId: auth.userId,
      afterState: { userId, isTeamAdmin },
    })

    return NextResponse.json({ access }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
