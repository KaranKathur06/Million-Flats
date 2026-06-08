import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : NaN
}

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)

  const status = safeString(searchParams.get('status')) || 'PENDING_REVIEW'
  const agent = safeString(searchParams.get('agent'))
  const city = safeString(searchParams.get('city'))

  const minPrice = safeNumber(searchParams.get('minPrice'))
  const maxPrice = safeNumber(searchParams.get('maxPrice'))

  const where: any = {
    sourceType: 'MANUAL',
  }

  if (status) where.status = status
  if (city) where.city = { contains: city, mode: 'insensitive' }

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    where.price = {
      ...(Number.isFinite(minPrice) ? { gte: minPrice } : null),
      ...(Number.isFinite(maxPrice) ? { lte: maxPrice } : null),
    }
  }

  if (agent) {
    where.agent = {
      user: {
        OR: [
          { name: { contains: agent, mode: 'insensitive' } },
          { email: { contains: agent, mode: 'insensitive' } },
        ],
      },
    }
  }

  const items = await (prisma as any).manualProperty.findMany({
    where,
    orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      title: true,
      city: true,
      community: true,
      price: true,
      currency: true,
      status: true,
      submittedAt: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          company: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  return NextResponse.json({ success: true, items })
}
