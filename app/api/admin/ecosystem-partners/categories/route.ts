import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const categories = await (prisma as any).ecosystemCategory.findMany({
    where: { isActive: true },
    orderBy: { priorityOrder: 'asc' },
    select: { id: true, slug: true, title: true },
  })

  return NextResponse.json({ success: true, data: categories })
}
