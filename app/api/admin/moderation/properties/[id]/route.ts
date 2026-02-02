import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const id = String(params?.id || '')
  if (!id) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id, sourceType: 'MANUAL' },
    include: {
      media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] },
      agent: { include: { user: true } },
    },
  })

  if (!property) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, property })
}
