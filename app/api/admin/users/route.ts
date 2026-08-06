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
  const role = safeString(searchParams.get('role'))
  const q = safeString(searchParams.get('q'))
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '25')))

  const where: any = {}
  if (role) where.role = role.toUpperCase()

  if (q) {
    const like = q
    where.OR = [
      { email: { contains: like, mode: 'insensitive' } },
      { name: { contains: like, mode: 'insensitive' } },
      { phone: { contains: like, mode: 'insensitive' } },
      { phoneNationalNumber: { contains: like, mode: 'insensitive' } },
      { id: { contains: like } },
    ]
  }

  const total = await prisma.user.count({ where })

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      status: true,
      profileCompletion: true,
      phone: true,
      image: true,
      country: true,
      lastLogin: true,
      verified: true,
      primaryAuthProvider: true,
      phoneNationalNumber: true,
      phoneCountryIso2: true,
    },
  })

  // Shape items for admin UI: avoid exposing internal placeholder emails for WhatsApp users
  const items = users.map((u: any) => {
    const provider = (u.primaryAuthProvider || '').toString() || ''
    let primaryIdentifier = u.email || ''
    if (provider.toUpperCase() === 'WHATSAPP' || (u.email || '').startsWith('wa_')) {
      // Prefer national number if available, otherwise raw phone
      primaryIdentifier = u.phoneNationalNumber || u.phone || ''
    }

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      profileCompletion: u.profileCompletion,
      phone: u.phone,
      image: u.image,
      country: u.country,
      lastLogin: u.lastLogin,
      verified: u.verified,
      identityProvider: provider || 'EMAIL',
      primaryIdentifier,
    }
  })

  return NextResponse.json({ success: true, items, total, page, limit })
}
