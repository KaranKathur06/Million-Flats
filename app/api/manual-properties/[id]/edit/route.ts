import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { writeAuditLog } from '@/lib/audit'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const id = String(params?.id || '').trim()
    if (!id) return bad('Not found', 404)

    const existing = await (prisma as any).manualProperty.findFirst({
      where: { id, agentId: auth.agentId, sourceType: 'MANUAL' },
      include: { media: true },
    })

    if (!existing) return bad('Not found', 404)
    if (String(existing.status) !== 'APPROVED') return bad('Only published listings can be edited using draft copies.')

    const cloneData: any = {
      agentId: existing.agentId,
      sourceType: 'MANUAL',
      status: 'DRAFT',
      clonedFromId: existing.id,
      lastCompletedStep: 'basics',

      title: existing.title,
      propertyType: existing.propertyType,
      intent: existing.intent,
      price: existing.price,
      currency: existing.currency,
      constructionStatus: existing.constructionStatus,
      shortDescription: existing.shortDescription,

      bedrooms: existing.bedrooms,
      bathrooms: existing.bathrooms,
      squareFeet: existing.squareFeet,

      countryCode: existing.countryCode,
      city: existing.city,
      community: existing.community,
      address: existing.address,
      latitude: existing.latitude,
      longitude: existing.longitude,

      developerName: existing.developerName,
      amenities: existing.amenities,
      customAmenities: existing.customAmenities,

      paymentPlanText: existing.paymentPlanText,
      emiNote: existing.emiNote,

      authorizedToMarket: existing.authorizedToMarket,
      exclusiveDeal: existing.exclusiveDeal,
      ownerContactOnFile: existing.ownerContactOnFile,

      duplicateScore: existing.duplicateScore,
      duplicateMatchedProjectId: existing.duplicateMatchedProjectId,
      duplicateOverrideConfirmed: existing.duplicateOverrideConfirmed,

      rejectionReason: null,
      submittedAt: null,
      archivedAt: null,
      archivedBy: null,
    }

    const created = await (prisma as any).manualProperty.create({
      data: cloneData,
      select: { id: true, status: true },
    })

    const media = Array.isArray(existing.media) ? existing.media : []
    if (media.length > 0) {
      await (prisma as any).manualPropertyMedia.createMany({
        data: media.map((m: any) => ({
          propertyId: created.id,
          category: m.category,
          url: m.url,
          s3Key: m.s3Key,
          mimeType: m.mimeType,
          sizeBytes: m.sizeBytes,
          altText: m.altText,
          position: m.position,
        })),
      })
    }

    await writeAuditLog({
      entityType: 'MANUAL_PROPERTY',
      entityId: created.id,
      action: 'PUBLISHED_CLONED_TO_DRAFT',
      performedByUserId: auth.userId,
      meta: { actor: 'agent', clonedFromId: id },
    })

    return NextResponse.json({ success: true, draftId: String(created.id), property: created })
  } catch (e) {
    console.error('Clone manual property for edit failed', e)
    return NextResponse.json({ success: false, message: 'Failed to create editable draft copy' }, { status: 500 })
  }
}
