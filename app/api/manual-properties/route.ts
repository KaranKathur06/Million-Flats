import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'

function errorToDetails(error: unknown) {
  if (!error || typeof error !== 'object') return null
  const anyErr = error as any
  return {
    name: typeof anyErr.name === 'string' ? anyErr.name : undefined,
    message: typeof anyErr.message === 'string' ? anyErr.message : undefined,
    code: typeof anyErr.code === 'string' ? anyErr.code : undefined,
    meta: anyErr.meta,
  }
}

function classifyDraftCreateError(error: unknown) {
  const details = errorToDetails(error)
  const msg = String((details as any)?.message || '')
  const looksLikeMissingTable = /manual_properties/i.test(msg) && /(does not exist|relation .* does not exist|undefined_table|42P01)/i.test(msg)
  if (looksLikeMissingTable) {
    return {
      status: 500,
      error: 'Manual listings database tables are missing. Run Prisma migrations (prisma migrate deploy).',
      code: 'DB_MISSING_TABLE',
      details,
    }
  }

  return {
    status: 500,
    error: 'Failed to save draft',
    code: 'DRAFT_CREATE_FAILED',
    details,
  }
}

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
    const info = classifyDraftCreateError(error)
    return NextResponse.json({ success: false, error: info.error, code: info.code, details: info.details }, { status: info.status })
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
