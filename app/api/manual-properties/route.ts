import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'

export async function POST() {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status })
    }

    const draft = await (prisma as any).manualProperty.create({
      data: {
        agentId: auth.agentId,
        sourceType: 'MANUAL',
        status: 'DRAFT',
        authorizedToMarket: false,
      } as any,
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({ success: true, draftId: String(draft.id), property: draft })
  } catch (error) {
    console.error('Manual properties: failed to create draft', error)
    return NextResponse.json({ success: false, error: 'Failed to save draft' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status })
    }

    const items = await (prisma as any).manualProperty.findMany({
      where: { agentId: auth.agentId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        title: true,
        city: true,
        community: true,
        price: true,
        currency: true,
        intent: true,
        updatedAt: true,
        createdAt: true,
      },
      take: 50,
    })

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('Manual properties: failed to list items', error)
    return NextResponse.json({ success: false, error: 'Failed to load drafts' }, { status: 500 })
  }
}
