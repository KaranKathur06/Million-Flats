import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  payload: z.record(z.unknown()).optional(),
  path: z.string().max(300).optional(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return bad('Invalid payload', 400)

    const session = await getServerSession(authOptions)
    const email = safeString((session?.user as any)?.email).toLowerCase() || null
    const userId = safeString((session?.user as any)?.id) || null

    const ipAddress = safeString(req.headers.get('x-forwarded-for'))?.split(',')[0]?.trim() || safeString(req.headers.get('x-real-ip')) || null
    const userAgent = safeString(req.headers.get('user-agent')) || null

    const created = await (prisma as any).analyticsEvent.create({
      data: {
        name: parsed.data.name,
        payload: parsed.data.payload ?? null,
        path: parsed.data.path ?? null,
        userId,
        email,
        ipAddress,
        userAgent,
      },
      select: { id: true, createdAt: true },
    })

    return NextResponse.json({ success: true, event: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return bad(msg || 'Internal server error', 500)
  }
}
