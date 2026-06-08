import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { recomputeAgentTotalListings } from '@/lib/featured/agentListings'
import { recomputeFeaturedScore } from '@/lib/featured/recomputeFeaturedScore'
import { requireAgentSession } from '@/lib/agentAuth'

const CreateListingSchema = z.object({
  externalId: z.string().trim().min(1).max(128),
  countryCode: z.enum(['UAE', 'INDIA']).optional(),
})

const DeleteListingSchema = z.object({
  externalId: z.string().trim().min(1).max(128),
})

async function requireAgent() {
  const auth = await requireAgentSession()
  if (!auth.ok) {
    return { ok: false as const, status: auth.status, message: auth.message }
  }
  return { ok: true as const, agentId: auth.agentId }
}

export async function GET() {
  const auth = await requireAgent()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const items = await (prisma as any).agentListing.findMany({
    where: { agentId: auth.agentId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, externalId: true, countryCode: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json({ success: true, items })
}

export async function POST(req: Request) {
  const auth = await requireAgent()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreateListingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
  }

  const createData: any = {
    agentId: auth.agentId,
    externalId: parsed.data.externalId,
  }
  if (parsed.data.countryCode) createData.countryCode = parsed.data.countryCode

  const updateData: any = {}
  if (parsed.data.countryCode) updateData.countryCode = parsed.data.countryCode

  const created = await (prisma as any).agentListing.upsert({
    where: {
      agentId_externalId: {
        agentId: auth.agentId,
        externalId: parsed.data.externalId,
      },
    },
    update: updateData,
    create: createData,
    select: { id: true, externalId: true, countryCode: true, createdAt: true, updatedAt: true },
  })

  await recomputeAgentTotalListings(auth.agentId).catch(() => null)
  await recomputeFeaturedScore(auth.agentId).catch(() => null)

  return NextResponse.json({ success: true, item: created })
}

export async function DELETE(req: Request) {
  const auth = await requireAgent()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const parsed = DeleteListingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
  }

  await (prisma as any).agentListing
    .delete({
      where: {
        agentId_externalId: {
          agentId: auth.agentId,
          externalId: parsed.data.externalId,
        },
      },
    })
    .catch(() => null)

  await recomputeAgentTotalListings(auth.agentId).catch(() => null)
  await recomputeFeaturedScore(auth.agentId).catch(() => null)

  return NextResponse.json({ success: true })
}
