import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const status = safeString(searchParams.get('status'))

  const where: any = {
    sourceType: 'MANUAL',
  }

  if (status) {
    where.status = status
  }

  const items = await (prisma as any).manualProperty.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: 500,
    select: {
      id: true,
      status: true,
      title: true,
      city: true,
      community: true,
      price: true,
      currency: true,
      intent: true,
      createdAt: true,
      updatedAt: true,
      submittedAt: true,
      rejectionReason: true,
      archivedAt: true,
      clonedFromId: true,
      agent: {
        select: {
          id: true,
          company: true,
          approved: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
      media: { select: { category: true, url: true, position: true } },
    },
  })

  return NextResponse.json({ success: true, items })
}
