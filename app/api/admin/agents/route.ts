import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const url = new URL(req.url)
  const approvedOnly = url.searchParams.get('approved') === '1' || url.searchParams.get('approved') === 'true'
  const archivedOnly = url.searchParams.get('archived') === '1' || url.searchParams.get('archived') === 'true'

  const agents = await (prisma as any).user.findMany({
    where: approvedOnly ? {
      role: 'AGENT',
      agent: { is: { approved: true, archivedAt: archivedOnly ? { not: null } : null } },
    } : {
      role: 'AGENT',
      agent: { is: { archivedAt: archivedOnly ? { not: null } : null } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      verified: true,
      role: true,
      status: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          company: true,
          license: true,
          whatsapp: true,
          approved: true,
          archivedAt: true,
          profileCompletion: true,
          createdAt: true,
        },
      },
    },
  })

  return NextResponse.json({ success: true, items: agents })
}
