import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentProfileSession } from '@/lib/agentAuth'

function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
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

export async function PATCH(req: Request) {
  try {
    const auth = await requireAgentProfileSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const body = await req.json().catch(() => null)
    const name = safeString(body?.name)
    const phone = safeString(body?.phone)
    const company = safeString(body?.company)
    const license = safeString(body?.license)
    const whatsapp = safeString(body?.whatsapp)
    const bio = safeString(body?.bio)

    const currentAgent = await (prisma as any).agent
      .findUnique({ where: { id: auth.agentId }, select: { profilePhoto: true, profileImageUrl: true } })
      .catch(() => null)

    const hasPhoto = Boolean(String(currentAgent?.profileImageUrl || currentAgent?.profilePhoto || '').trim())
    const hasBio = Boolean(bio)
    const hasPhone = Boolean(phone)
    const hasWhatsapp = Boolean(whatsapp)
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

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        name: name || null,
        phone: phone || null,
        agent: {
          update: {
            company: company || null,
            license: license || null,
            whatsapp: whatsapp || null,
            bio: bio || null,
            profileCompletion: completion,
            profileCompletionUpdatedAt: new Date(),
          } as any,
        } as any,
      },
      include: { agent: true },
    })

    return NextResponse.json({ success: true, user: updated }, { status: 200 })
  } catch (error) {
    console.error('Update agent profile error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
