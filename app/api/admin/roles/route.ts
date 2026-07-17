import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

const ROLE_DEFS = [
  { value: 'USER', label: 'Buyer', emoji: '👤', description: 'Standard property buyer' },
  { value: 'AGENT', label: 'Agent', emoji: '🏢', description: 'Registered property agent' },
  { value: 'DEVELOPER', label: 'Developer', emoji: '🏗', description: 'Property developer' },
  { value: 'VERIFIER', label: 'Verifier', emoji: '🛡', description: 'Verification operator' },
  { value: 'MODERATOR', label: 'Moderator', emoji: '⚙', description: 'Content & community moderator' },
  { value: 'ADMIN', label: 'Admin', emoji: '⭐', description: 'Platform administrator' },
  { value: 'SUPERADMIN', label: 'Super Admin', emoji: '👑', description: 'Full system access' },
]

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  // Compute counts per role
  const groups = await (prisma as any).user.groupBy({ by: ['role'], _count: { _all: true } })
  const counts: Record<string, number> = {}
  for (const g of groups) {
    if (g.role) counts[String(g.role).toUpperCase()] = Number(g._count._all || 0)
  }

  const items = ROLE_DEFS.map((r) => ({
    value: r.value,
    label: r.label,
    emoji: r.emoji,
    description: r.description,
    count: counts[r.value] || 0,
  }))

  return NextResponse.json({ success: true, items })
}
