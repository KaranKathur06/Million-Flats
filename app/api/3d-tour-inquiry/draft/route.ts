import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DraftSchema = z.object({
  step: z.number().int().min(0).max(10),
  form: z.record(z.unknown()),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const email = String((session.user as { email?: string }).email || '').trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, preference: { select: { filters: true } } },
  })
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const filters = (user.preference?.filters as Record<string, unknown> | null) || {}
  const draft = filters.threeDTourDraft as { step?: number; form?: Record<string, unknown> } | undefined

  return NextResponse.json({ success: true, draft: draft || null })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const email = String((session.user as { email?: string }).email || '').trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, preference: true },
  })
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = DraftSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid draft' }, { status: 400 })
  }

  const existingFilters = (user.preference?.filters as Prisma.InputJsonObject | null) || {}
  const filters: Prisma.InputJsonValue = {
    ...existingFilters,
    threeDTourDraft: {
      step: parsed.data.step,
      form: parsed.data.form as Prisma.InputJsonValue,
      updatedAt: new Date().toISOString(),
    },
  }

  if (user.preference) {
    await prisma.userPreference.update({
      where: { userId: user.id },
      data: { filters },
    })
  } else {
    await prisma.userPreference.create({
      data: {
        userId: user.id,
        countryCode: 'INDIA',
        filters,
      },
    })
  }

  return NextResponse.json({ success: true })
}
