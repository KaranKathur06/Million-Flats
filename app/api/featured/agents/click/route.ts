import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const BodySchema = z.object({
  agentId: z.string().uuid(),
  countryIso2: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    const { agentId, countryIso2 } = parsed.data

    await (prisma as any).featuredAgentClick
      .create({
        data: {
          agentId,
          countryIso2: countryIso2 || null,
        },
        select: { id: true },
      })
      .catch(() => null)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e) {
    console.error('Featured agent click: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to track click' }, { status: 500 })
  }
}
