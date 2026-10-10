/**
 * GET /api/team/directory
 *
 * Returns the active team directory for explicitly approved team members.
 * Server-enforced authorization at this endpoint; the public page reads its
 * published directory data directly and does not use this private API.
 *
 * Cache policy: private, no-store — must never be served from a shared cache.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeamAccess, denyTeamResult } from '@/lib/team/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  // ── 1. Enforce team membership ──
  const auth = await requireTeamAccess()
  if (!auth.ok) return denyTeamResult(auth)

  try {
    // ── 2. Fetch active members in display order ──
    const members = await prisma.teamMember.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        displayName: true,
        designation: true,
        bio: true,
        imageUrl: true,
        linkedinUrl: true,
        location: true,
        displayOrder: true,
      },
    })

    // ── 3. Return with private cache headers ──
    return NextResponse.json(
      { members, isTeamAdmin: auth.isTeamAdmin },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    )
  } catch {
    // Fail closed: any DB error must not reveal directory data
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
