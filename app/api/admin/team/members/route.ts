/**
 * GET  /api/admin/team/members   — list all members (all statuses) for admins
 * POST /api/admin/team/members   — create a new team member profile
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTeamAdmin, denyTeamResult } from '@/lib/team/auth'
import { writeAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// ── Validation schemas ────────────────────────────────────────────────────────

const createMemberSchema = z.object({
  displayName: z.string().min(1).max(120).trim(),
  designation: z.string().max(200).trim().optional().or(z.literal('')),
  bio: z.string().max(2000).trim().optional().or(z.literal('')),
  imageUrl: z.string().url().max(500).optional().or(z.literal('')),
  linkedinUrl: z.string().url().max(500).optional().or(z.literal('')),
  location: z.string().max(100).trim().optional().or(z.literal('')),
  displayOrder: z.number().int().min(0).max(9999).optional(),
  userId: z.string().uuid().optional().or(z.literal('')),
})

// ── GET: List all members ─────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  try {
    const members = await prisma.teamMember.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    return NextResponse.json({ members }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── POST: Create member ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireTeamAdmin()
  if (!auth.ok) return denyTeamResult(auth)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const data = parsed.data

  // If a userId is provided, verify the user exists and has no existing profile
  if (data.userId) {
    const existingUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, teamMember: { select: { id: true } } },
    })
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (existingUser.teamMember) {
      return NextResponse.json({ error: 'A team member profile already exists for this user' }, { status: 409 })
    }
  }

  try {
    const member = await prisma.teamMember.create({
      data: {
        displayName: data.displayName,
        designation: data.designation || null,
        bio: data.bio || null,
        imageUrl: data.imageUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        location: data.location || null,
        displayOrder: data.displayOrder ?? 0,
        userId: data.userId || null,
        status: 'DRAFT',
      },
    })

    // Audit log
    await writeAuditLog({
      entityType: 'TEAM_MEMBER',
      entityId: member.id,
      action: 'TEAM_MEMBER_CREATED',
      performedByUserId: auth.userId,
      afterState: { displayName: member.displayName, status: member.status },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
