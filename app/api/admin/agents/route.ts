import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const agents = await (prisma as any).user.findMany({
    where: { role: 'AGENT' },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      verified: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          company: true,
          license: true,
          whatsapp: true,
          approved: true,
          profileCompletion: true,
          createdAt: true,
        },
      },
    },
  })

  return NextResponse.json({ success: true, items: agents })
}
