import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentProfileSession } from '@/lib/agentAuth'
import { writeAuditLog } from '@/lib/audit'

const MIN_BIO_LENGTH = 150

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function normalizePhone(v: string) {
  return v.replace(/[^0-9+]/g, '').trim()
}

function clampCompletion(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

const completionWeights = {
  photo: 15,
  bio: 15,
  phone: 10,
  whatsapp: 10,
  license: 15,
  listing: 20,
  media: 15,
}

export async function POST() {
  try {
    const auth = await requireAgentProfileSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const agent = await (prisma as any).agent
      .findUnique({
        where: { id: auth.agentId },
        include: { user: true },
      })
      .catch(() => null)

    if (!agent?.id) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    const currentStatus = String(agent?.profileStatus || 'DRAFT').toUpperCase()
    if (currentStatus !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'This profile has already been submitted.' },
        { status: 409 }
      )
    }

    const license = safeString(agent?.license)
    const phone = normalizePhone(safeString(agent?.user?.phone))
    const bio = safeString(agent?.bio)
    const photo = safeString(agent?.profilePhoto)

    const errors: Record<string, string> = {}

    if (!license) errors.license = 'License number is required.'
    if (!phone || phone.length < 8) errors.phone = 'Phone number is required.'
    if (!bio || bio.length < MIN_BIO_LENGTH) errors.bio = `Bio must be at least ${MIN_BIO_LENGTH} characters.`
    if (!photo) errors.photo = 'Profile photo is required.'

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, message: 'Profile incomplete', errors }, { status: 400 })
    }

    const hasPhoto = Boolean(photo)
    const hasBio = Boolean(bio)
    const hasPhone = Boolean(phone)
    const hasWhatsapp = Boolean(safeString(agent?.whatsapp))
    const hasLicense = Boolean(license)

    const agentListingCount = await (prisma as any).agentListing
      .findMany({ where: { agentId: auth.agentId }, distinct: ['externalId'], select: { externalId: true } })
      .then((rows: any[]) => rows.length)
      .catch(() => 0)

    const manualApprovedCount = await (prisma as any).manualProperty
      .count({ where: { agentId: auth.agentId, status: 'APPROVED', sourceType: 'MANUAL' } })
      .catch(() => 0)

    const hasPublishedListing = agentListingCount > 0 || manualApprovedCount > 0

    const hasMedia = await (prisma as any).manualPropertyMedia
      .findFirst({
        where: { property: { agentId: auth.agentId, status: 'APPROVED', sourceType: 'MANUAL' } },
        select: { id: true },
      })
      .then((row: any) => Boolean(row?.id))
      .catch(() => false)

    const completion = clampCompletion(
      (hasPhoto ? completionWeights.photo : 0) +
        (hasBio ? completionWeights.bio : 0) +
        (hasPhone ? completionWeights.phone : 0) +
        (hasWhatsapp ? completionWeights.whatsapp : 0) +
        (hasLicense ? completionWeights.license : 0) +
        (hasPublishedListing ? completionWeights.listing : 0) +
        (hasMedia ? completionWeights.media : 0)
    )

    if (completion < 40) {
      return NextResponse.json(
        { success: false, message: 'Profile completion must be at least 40% before submitting.', errors: { completion: 'Increase profile completion.' } },
        { status: 400 }
      )
    }

    const updated = await (prisma as any).agent.update({
      where: { id: auth.agentId },
      data: {
        profileStatus: 'SUBMITTED',
        profileCompletion: completion,
        profileCompletionUpdatedAt: new Date(),
      },
      select: { id: true, profileStatus: true, profileCompletion: true },
    })

    await writeAuditLog({
      entityType: 'AGENT',
      entityId: auth.agentId,
      action: 'AGENT_PROFILE_SUBMITTED',
      performedByUserId: auth.userId,
      meta: {
        actor: 'agent',
        profileCompletion: completion,
      },
    })

    return NextResponse.json({ success: true, agent: updated })
  } catch (error) {
    console.error('Agent profile submit: failed', error)
    return NextResponse.json({ success: false, message: 'Failed to submit profile' }, { status: 500 })
  }
}
