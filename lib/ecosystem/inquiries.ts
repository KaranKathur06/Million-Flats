import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getRedis } from '@/lib/redis'
import { ecosystemSlugToCategory } from '@/lib/leads/createLead'
import { notifyAdminNewLead } from '@/lib/leads/notifications'
import { sendEmail } from '@/lib/email/sendEmail'

const RATE_WINDOW_SECONDS = 15 * 60

const RATE_LIMIT_SCRIPT = `
local accountCount = tonumber(redis.call('GET', KEYS[1]) or '0')
local ipCount = tonumber(redis.call('GET', KEYS[2]) or '0')
local hasAccount = ARGV[4] == '1'
if (hasAccount and accountCount >= tonumber(ARGV[1])) or ipCount >= tonumber(ARGV[2]) then
  return 0
end
if hasAccount then
  accountCount = redis.call('INCR', KEYS[1])
  if accountCount == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3])) end
end
ipCount = redis.call('INCR', KEYS[2])
if ipCount == 1 then redis.call('EXPIRE', KEYS[2], tonumber(ARGV[3])) end
return 1
`

export type EcosystemInquiryInput = {
  categorySlug: string
  partnerId?: string | null
  partnerSlug?: string | null
  name: string
  email: string
  phone: string
  city?: string | null
  propertyType?: string | null
  budget?: string | null
  requirement?: string | null
  message: string
  consentToShare: true
  consentVersion: string
  idempotencyKey: string
  userId: string | null
  sourceIp: string | null
}

export class EcosystemInquiryError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'EcosystemInquiryError'
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  )
}

function normalizedOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function buildEcosystemInquiryPayloadHash(
  input: EcosystemInquiryInput,
  categorySlug: string,
  partnerId: string | null,
  sourcePage: string
): string {
  const canonical = JSON.stringify({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    message: input.message.trim(),
    consentToShare: input.consentToShare,
    consentVersion: input.consentVersion,
    categorySlug,
    partnerId,
    city: normalizedOptionalText(input.city),
    propertyType: normalizedOptionalText(input.propertyType),
    budget: normalizedOptionalText(input.budget),
    requirement: normalizedOptionalText(input.requirement),
    sourceType: 'ECOSYSTEM_PARTNER_INQUIRY',
    sourcePage,
    userId: input.userId,
  })
  return createHash('sha256').update(canonical).digest('hex')
}

async function findExistingInquiry(idempotencyKey: string, database: any = prisma) {
  return database.lead.findFirst({
    where: {
      OR: [
        { requestKey: idempotencyKey },
        { legacyTable: 'ecosystem_inquiry', legacyId: idempotencyKey },
      ],
    },
    select: { id: true, userId: true, metadata: true, createdAt: true },
  })
}

async function consumeInquiryLimit(userId: string | null, sourceIp: string): Promise<void> {
  const redis = getRedis()
  if (!redis) {
    throw new EcosystemInquiryError('Inquiry submission is temporarily unavailable.', 503)
  }

  const ipHash = createHash('sha256').update(sourceIp).digest('hex')
  let allowed: number
  try {
    allowed = Number(await redis.eval(
      RATE_LIMIT_SCRIPT,
      2,
      userId ? `ecosystem-inquiry:user:${userId}` : 'ecosystem-inquiry:anonymous',
      `ecosystem-inquiry:ip:${ipHash}`,
      '5',
      '30',
      String(RATE_WINDOW_SECONDS),
      userId ? '1' : '0'
    ))
  } catch {
    console.error('[ecosystem-inquiry] Redis rate-limit operation failed')
    throw new EcosystemInquiryError('Inquiry submission is temporarily unavailable.', 503)
  }

  if (allowed !== 1) {
    throw new EcosystemInquiryError('Too many inquiries. Please try again later.', 429)
  }
}

async function sendInquiryNotifications(params: {
  leadId: string
  name: string
  email: string
  phone: string
  message: string
  categoryTitle: string
  partnerName: string | null
  partnerEmail: string | null
  city?: string | null
  budget?: string | null
}) {
  const deliveries = await Promise.all([
    notifyAdminNewLead({
      leadType: 'ECOSYSTEM',
      leadId: params.leadId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      category: params.categoryTitle,
      projectOrCompany: params.partnerName || 'Ecosystem partner directory',
      message: params.message,
      propertyName: params.city || undefined,
      budgetRange: params.budget || undefined,
    }),
    sendEmail({
      to: params.email,
      subject: 'Your MillionFlats partner inquiry was received',
      text: [
        `Hi ${params.name},`,
        '',
        `We received your request for ${params.categoryTitle}${params.partnerName ? ` from ${params.partnerName}` : ''}.`,
        'A MillionFlats representative will follow up using your account details.',
        '',
        `Inquiry reference: ${params.leadId}`,
      ].join('\n'),
    }),
    ...(params.partnerEmail
      ? [
          sendEmail({
            to: params.partnerEmail,
            subject: `New MillionFlats inquiry: ${params.categoryTitle}`,
            text: [
              `A new inquiry has been routed to ${params.partnerName}.`,
              '',
              `Inquiry reference: ${params.leadId}`,
              `Customer: ${params.name}`,
              `Email: ${params.email}`,
              `Phone: ${params.phone}`,
              params.city ? `City: ${params.city}` : null,
              params.budget ? `Budget: ${params.budget}` : null,
              '',
              params.message,
            ]
              .filter(Boolean)
              .join('\n'),
          }),
        ]
      : []),
  ])
  return deliveries.every((delivery) => delivery.ok)
}

export async function submitEcosystemInquiry(input: EcosystemInquiryInput) {
  const category = await (prisma as any).ecosystemCategory.findUnique({
    where: { slug: input.categorySlug },
    select: { id: true, slug: true, title: true, isActive: true },
  })
  if (!category || !category.isActive) {
    throw new EcosystemInquiryError('This ecosystem category is unavailable.', 404)
  }
  if (category.slug !== input.categorySlug) {
    throw new EcosystemInquiryError('This ecosystem category is unavailable.', 404)
  }

  let partner: any = null
  if (input.partnerSlug) {
    partner = await (prisma as any).ecosystemPartner.findFirst({
      where: {
        slug: input.partnerSlug,
        categoryId: category.id,
        status: 'APPROVED',
        isActive: true,
      },
      select: { id: true, name: true, slug: true, contactEmail: true },
    })
    if (!partner) throw new EcosystemInquiryError('Partner not found.', 404)
    if (input.partnerId && input.partnerId !== partner.id) {
      throw new EcosystemInquiryError('Inquiry target does not match.', 400)
    }
  } else if (input.partnerId) {
    partner = await (prisma as any).ecosystemPartner.findFirst({
      where: {
        id: input.partnerId,
        categoryId: category.id,
        ...{ status: 'APPROVED', isActive: true },
      },
      select: { id: true, name: true, slug: true, contactEmail: true },
    })
    if (!partner) throw new EcosystemInquiryError('Partner not found.', 404)
  }

  const selectedPartnerId: string | null = partner?.id || null
  const sourceIp = input.sourceIp
  if (!sourceIp) {
    throw new EcosystemInquiryError('Inquiry submission is temporarily unavailable.', 503)
  }
  const sourcePage = partner
    ? `/partners/${category.slug}/${partner.slug}`
    : `/ecosystem-partners/${category.slug}`
  const hash = buildEcosystemInquiryPayloadHash(input, category.slug, selectedPartnerId, sourcePage)
  const metadata = {
    ecosystemCategorySlug: category.slug,
    ecosystemCategoryTitle: category.title,
    partnerId: selectedPartnerId,
    partnerName: partner?.name || null,
    city: normalizedOptionalText(input.city),
    requirement: normalizedOptionalText(input.requirement),
    consentToShare: true,
    consentRecordedAt: new Date().toISOString(),
    consentVersion: input.consentVersion,
    sourcePage,
    idempotencyPayloadHash: hash,
    notificationStatus: 'PENDING',
    leadSource: 'Ecosystem Partner Lead',
  }

  let lead: { id: string } | null = null
  let reusedResult: { leadId: string; reused: true; notificationStatus: 'sent' | 'pending' } | null = null
  try {
    const transactionResult = await (prisma as any).$transaction(async (tx: any) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.idempotencyKey}))`)
      const existing = await findExistingInquiry(input.idempotencyKey, tx)
      if (existing) {
        const existingMetadata = existing.metadata as Record<string, unknown> | null
        if (existing.userId !== input.userId || existingMetadata?.idempotencyPayloadHash !== hash) {
          throw new EcosystemInquiryError('This inquiry key was already used for a different request.', 409)
        }
        return {
          reused: true as const,
          lead: {
            leadId: existing.id as string,
            reused: true as const,
            notificationStatus: existingMetadata?.notificationStatus === 'SENT' ? 'sent' as const : 'pending' as const,
          },
        }
      }

      await consumeInquiryLimit(input.userId, sourceIp)
      const created = await tx.lead.create({
        data: {
          leadType: 'ECOSYSTEM',
          category: ecosystemSlugToCategory(category.slug) || category.title,
          sourceId: selectedPartnerId,
          sourceName: partner?.name || category.title,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone.trim(),
          message: [
            input.requirement?.trim() ? `Requirement: ${input.requirement.trim()}` : null,
            input.message.trim(),
          ]
            .filter(Boolean)
            .join('\n\n'),
          propertyType: normalizedOptionalText(input.propertyType),
          budgetRange: normalizedOptionalText(input.budget),
          country: 'INDIA',
          status: 'NEW',
          ecosystemPartnerId: selectedPartnerId,
          userId: input.userId,
          sourceType: 'ECOSYSTEM_PARTNER_INQUIRY',
          sourceUrl: sourcePage,
          landingUrl: sourcePage,
          requestKey: input.idempotencyKey,
          requestPayloadHash: hash,
          consentToShare: true,
          consentRecordedAt: new Date(),
          metadata,
        },
        select: { id: true },
      })
      return { reused: false as const, lead: created }
    })
    if (transactionResult.reused) reusedResult = transactionResult.lead
    else lead = transactionResult.lead
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const duplicate = await findExistingInquiry(input.idempotencyKey)
    if (!duplicate) throw error
    const duplicateMetadata = duplicate.metadata as Record<string, unknown> | null
    if (duplicate.userId !== input.userId || duplicateMetadata?.idempotencyPayloadHash !== hash) {
      throw new EcosystemInquiryError('This inquiry key was already used for a different request.', 409)
    }
    return {
      leadId: duplicate.id as string,
      reused: true,
      notificationStatus: duplicateMetadata?.notificationStatus === 'SENT' ? 'sent' as const : 'pending' as const,
    }
  }

  if (reusedResult) return reusedResult
  if (!lead) throw new Error('Inquiry transaction completed without a lead result.')
  const notifications = await retryEcosystemInquiryNotifications(lead.id)

  return {
    leadId: lead.id,
    reused: false,
    notificationStatus: notifications.notificationStatus,
  }
}

export async function retryEcosystemInquiryNotifications(leadId: string) {
  const claim = await (prisma as any).$transaction(async (tx: any) => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${leadId}))`)
    const lead = await tx.lead.findFirst({
      where: { id: leadId, leadType: 'ECOSYSTEM', deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        category: true,
        budgetRange: true,
        metadata: true,
        updatedAt: true,
        ecosystemPartner: { select: { name: true, contactEmail: true } },
      },
    })
    if (!lead) throw new EcosystemInquiryError('Ecosystem inquiry not found.', 404)
    const metadata = lead.metadata as Record<string, unknown> | null
    if (metadata?.notificationStatus === 'SENT') {
      return { lead: null, metadata, complete: true }
    }
    const inProgress =
      metadata?.notificationStatus === 'SENDING' &&
      Date.now() - new Date(lead.updatedAt).getTime() < 10 * 60 * 1000
    if (inProgress) return { lead: null, metadata, complete: false }

    await tx.lead.update({
      where: { id: lead.id },
      data: { metadata: { ...(metadata || {}), notificationStatus: 'SENDING' } },
    })
    return { lead, metadata, complete: false }
  })

  if (!claim.lead) {
    return {
      leadId,
      notificationStatus: claim.complete ? 'sent' as const : 'pending' as const,
      reused: true,
    }
  }
  const lead = claim.lead
  const metadata = claim.metadata as Record<string, unknown> | null

  let sent = false
  try {
    sent = await sendInquiryNotifications({
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      message: lead.message || '',
      categoryTitle: String(metadata?.ecosystemCategoryTitle || lead.category || 'Ecosystem services'),
      partnerName: lead.ecosystemPartner?.name || null,
      partnerEmail: lead.ecosystemPartner?.contactEmail || null,
      city: typeof metadata?.city === 'string' ? metadata.city : null,
      budget: lead.budgetRange,
    })
  } catch {
    console.error('[ecosystem-inquiry] Notification delivery failed', { leadId: lead.id })
  }
  const notificationStatus = sent ? 'SENT' : 'PENDING'
  await (prisma as any).lead.update({
    where: { id: lead.id },
    data: { metadata: { ...(metadata || {}), notificationStatus } },
  })
  if (!sent) console.error('[ecosystem-inquiry] Notification retry incomplete', { leadId: lead.id })
  return { leadId: lead.id as string, notificationStatus: sent ? 'sent' as const : 'pending' as const, reused: false }
}
