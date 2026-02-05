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

    if (role !== 'AGENT') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const email = String((session.user as any).email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const name = safeString(body?.name)
    const phone = safeString(body?.phone)
    const company = safeString(body?.company)
    const license = safeString(body?.license)
    const whatsapp = safeString(body?.whatsapp)
    const bio = safeString(body?.bio)
    const image = safeString(body?.image)

    const updated = await prisma.user.update({
      where: { email },
      data: {
        name: name || null,
        phone: phone || null,
        image: image || null,
        agent: {
          upsert: {
            create: {
              company: company || null,
              license: license || null,
              whatsapp: whatsapp || null,
              bio: bio || null,
            } as any,
            update: {
              company: company || null,
              license: license || null,
              whatsapp: whatsapp || null,
              bio: bio || null,
            } as any,
          },
        } as any,
      },
      include: { agent: true },
    })

    return NextResponse.json({ success: true, user: updated }, { status: 200 })
  } catch (error) {
    console.error('Update agent profile error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
