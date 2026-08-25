import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentDraftSession } from '@/lib/agentAuth'
import { evaluateManualPropertyRisk } from '@/lib/services/riskEngine'
import { ensureModerationCase, setCaseRiskWithReasons, setModerationQueue } from '@/lib/services/moderation.service'
import { validateManualPropertyStep } from '@/lib/manualPropertyForm'

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
  try {
    const auth = await requireAgentDraftSession()
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

    const validationErrors = validateManualPropertyStep('review', {
      title: property.title,
      propertyType: property.propertyType,
      intent: property.intent,
      price: property.price,
      currency: property.currency,
      shortDescription: property.shortDescription,
      squareFeet: property.squareFeet,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      city: property.city,
      community: property.community,
      latitude: property.latitude,
      longitude: property.longitude,
      media: (property.media || []).map((media: { category: string }) => ({ category: media.category })),
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      paymentPlan: property.paymentPlan,
      authorizedToMarket: property.authorizedToMarket,
      constructionStatus: property.constructionStatus,
    })
    const firstValidationError = Object.values(validationErrors)[0]
    if (firstValidationError) return bad(firstValidationError)

    const score = typeof property.duplicateScore === 'number' ? property.duplicateScore : 0
    if (score > 75 && property.duplicateMatchedProjectId && property.developerName) {
      return bad('Remove developer name for listings that match an existing listing. This prevents branding duplication.')
    }

    if (score > 75 && !parsed.data.duplicateOverrideConfirmed && !property.duplicateOverrideConfirmed) {
      return bad('Duplicate warning requires confirmation.')
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const updatedProperty = await (tx as any).manualProperty.update({
        where: { id: property.id },
        data: {
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
          rejectionReason: null,
          duplicateOverrideConfirmed: Boolean(parsed.data.duplicateOverrideConfirmed) || property.duplicateOverrideConfirmed,
        } as any,
        select: { id: true, status: true },
      })

      const mcase = await ensureModerationCase(tx, {
        entityType: 'MANUAL_PROPERTY',
        entityId: String(property.id),
        createdByUserId: auth.userId,
      })

      const risk = await evaluateManualPropertyRisk({ propertyId: String(property.id) })
      await setCaseRiskWithReasons(tx, {
        caseId: mcase.id,
        currentRiskScore: risk.score,
        currentRiskReasons: risk.reasons,
        riskEngineVersion: risk.version,
      })

      if (risk.score >= 50) {
        await setModerationQueue(tx, { caseId: mcase.id, queue: 'HIGH_RISK' })
      }

      return updatedProperty
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
  } catch (error) {
    console.error('Manual property submit: failed', error)
    return NextResponse.json({ success: false, message: 'Failed to submit listing' }, { status: 500 })
  }
}
