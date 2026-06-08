import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const entityType = String(searchParams.get('entityType') || '').trim().toUpperCase()
  const action = String(searchParams.get('action') || '').trim().toUpperCase()

  const where: any = {}
  if (entityType) where.entityType = entityType
  if (action) where.action = action

  const rows = await (prisma as any).auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { performedBy: { select: { id: true, email: true, name: true } } },
  })

  return NextResponse.json({ success: true, items: rows })
}
