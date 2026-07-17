import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

const ROLE_DEFS = [
  { value: 'USER', label: 'User', emoji: '👤', description: 'Standard platform user' },
  { value: 'BUYER', label: 'Buyer', emoji: '🛒', description: 'Property buyer' },
  { value: 'AGENT', label: 'Agent', emoji: '🏷️', description: 'Listing agent' },
  { value: 'DEVELOPER', label: 'Developer', emoji: '🏗️', description: 'Property developer' },
  { value: 'AGENCY', label: 'Agency', emoji: '🏢', description: 'Agency account' },
  { value: 'MODERATOR', label: 'Moderator', emoji: '🛡️', description: 'Content moderator' },
  { value: 'VERIFIER', label: 'Verifier', emoji: '✅', description: 'Verification team' },
  { value: 'ADMIN', label: 'Admin', emoji: '🔧', description: 'Platform admin' },
  { value: 'SUPERADMIN', label: 'Superadmin', emoji: '👑', description: 'Super administrator' },
]

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  // Use groupBy to get counts per role
  const groups = await (prisma as any).user.groupBy({ by: ['role'], _count: { _all: true } }).catch(() => [])
  const counts: Record<string, number> = {}
  for (const g of groups as any[]) {
    if (g.role) counts[String(g.role).toUpperCase()] = Number(g._count?._all || 0)
  }

  const items = ROLE_DEFS.map((r) => ({
    value: r.value,
    label: r.label,
    emoji: r.emoji,
    description: r.description,
    count: counts[r.value] || 0,
  }))

  return NextResponse.json({ success: true, items }, { status: 200 })
}
