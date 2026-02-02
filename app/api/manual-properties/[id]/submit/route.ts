import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { reellyGetProject } from '@/lib/reelly'

const SubmitSchema = z.object({
  duplicateOverrideConfirmed: z.boolean().optional(),
})

function bad(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 400 })
}

function normalizeName(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAgentSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) {
    return bad('Invalid data')
  }

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id: params.id, agentId: auth.agentId },
    include: { media: true },
  })

  if (!property) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

  if (property.status !== 'DRAFT' && property.status !== 'REJECTED') {
    return bad('This listing has already been submitted.')
  }

  if (!property.title || property.title.trim().length < 6) return bad('Property title is required.')
  if (!property.propertyType) return bad('Property type is required.')
  if (!property.intent) return bad('Sale/Rent is required.')
  if (!property.price || property.price <= 0) return bad('Price is required.')
  if (!property.constructionStatus) return bad('Property status is required.')
  if (!property.shortDescription || property.shortDescription.trim().length < 40) return bad('Short description is required.')

  if (!property.city || !property.community) return bad('City and community are required.')
  if (typeof property.latitude !== 'number' || typeof property.longitude !== 'number') {
    return bad('Coordinates are required.')
  }

  const hasCover = (property.media || []).some((m: { category: string }) => m.category === 'COVER')
  if (!hasCover) return bad('Cover image is required.')

  if (!property.authorizedToMarket) {
    return bad('You must confirm you are authorized to market this property.')
  }

  const score = typeof property.duplicateScore === 'number' ? property.duplicateScore : 0
  if (score > 75 && property.duplicateMatchedProjectId && property.developerName) {
    return bad('Remove developer name for listings that match a verified project. This prevents developer branding duplication.')
  }

  if (score > 75 && property.duplicateMatchedProjectId && property.title) {
    try {
      const p = await reellyGetProject<any>(String(property.duplicateMatchedProjectId))
      const projectName = String((p as any)?.name || (p as any)?.title || '').trim()
      if (projectName && normalizeName(projectName) === normalizeName(String(property.title))) {
        return bad('Manual listings cannot reuse the exact verified project name. Please adjust the title.')
      }
    } catch {
      // ignore
    }
  }

  if (score > 75 && !parsed.data.duplicateOverrideConfirmed && !property.duplicateOverrideConfirmed) {
    return bad('Duplicate warning requires confirmation.')
  }

  const updated = await (prisma as any).manualProperty.update({
    where: { id: property.id },
    data: {
      status: 'PENDING_REVIEW',
      submittedAt: new Date(),
      rejectionReason: null,
      duplicateOverrideConfirmed: Boolean(parsed.data.duplicateOverrideConfirmed) || property.duplicateOverrideConfirmed,
    } as any,
    select: { id: true, status: true },
  })

  if (score > 75 && (parsed.data.duplicateOverrideConfirmed || property.duplicateOverrideConfirmed) && property.duplicateMatchedProjectId) {
    await (prisma as any).manualDuplicateOverrideLog.create({
      data: {
        propertyId: property.id,
        agentId: auth.agentId,
        score,
        matchedProjectId: String(property.duplicateMatchedProjectId),
      },
    })

    console.log('analytics_event', {
      event: 'manual_duplicate_override',
      agentId: auth.agentId,
      propertyId: property.id,
      score,
      matchedProjectId: String(property.duplicateMatchedProjectId),
    })
  }

  return NextResponse.json({ success: true, property: updated })
}
