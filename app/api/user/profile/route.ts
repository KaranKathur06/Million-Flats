import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = String((session?.user as any)?.role || '').toUpperCase()

    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    if (role !== 'USER') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const email = String((session.user as any).email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const name = safeString(body?.name)
    const phone = safeString(body?.phone)

    const updated = await prisma.user.update({
      where: { email },
      data: {
        name: name || null,
        phone: phone || null,
      },
      select: { id: true, name: true, email: true, phone: true, role: true },
    })

    return NextResponse.json({ success: true, user: updated }, { status: 200 })
  } catch (error) {
    console.error('Update user profile error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
