import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const items = await (prisma as any).manualProperty.findMany({
    where: { sourceType: 'MANUAL', status: 'DRAFT' },
    orderBy: [{ updatedAt: 'desc' }],
    take: 500,
    select: {
      id: true,
      status: true,
      title: true,
      city: true,
      community: true,
      lastCompletedStep: true,
      createdAt: true,
      updatedAt: true,
      agent: {
        select: {
          id: true,
          company: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
      media: { select: { category: true, url: true } },
    },
  })

  return NextResponse.json({ success: true, items })
}
