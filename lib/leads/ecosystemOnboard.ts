import { prisma } from '@/lib/prisma'
import { ecosystemCategoryToSlug, normalizeEcosystemCategory } from '@/lib/leads/types'
import { slugifyPartnerName } from '@/lib/ecosystem/slugify'
import { revalidatePartnerSurfaces } from '@/lib/ecosystem/revalidatePartner'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function pickCompanyName(companyDetails: Record<string, unknown> | null | undefined) {
  if (!companyDetails) return ''
  return (
    safeString(companyDetails.legalCompanyName) ||
    safeString(companyDetails.fullLegalName) ||
    safeString(companyDetails.businessName) ||
    safeString(companyDetails.legalBusinessName) ||
    ''
  )
}

function pickContact(metadata: Record<string, unknown> | null | undefined) {
  const contactInfo = (metadata?.contactInfo as Record<string, unknown>) || {}
  const companyDetails = (metadata?.companyDetails as Record<string, unknown>) || {}
  return {
    name:
      safeString(contactInfo.partnerManagerName) ||
      safeString(contactInfo.contactName) ||
      safeString(contactInfo.principalName) ||
      safeString(contactInfo.bdName) ||
      safeString(contactInfo.partnershipManager) ||
      'Partner',
    email: safeString(contactInfo.email).toLowerCase(),
    phone: safeString(contactInfo.phone),
    companyName: pickCompanyName(companyDetails),
    logoUrl: safeString(metadata?.logoUrl),
  }
}

/** Create directory partner from an ecosystem registration lead and link it. */
export async function onboardEcosystemLeadToPartner(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      leadType: true,
      status: true,
      category: true,
      metadata: true,
      ecosystemPartnerId: true,
      legacyId: true,
      sourceId: true,
    },
  })

  if (!lead || lead.leadType !== 'ECOSYSTEM') {
    throw new Error('Not an ecosystem registration lead')
  }

  if (lead.ecosystemPartnerId) {
    return { partnerId: lead.ecosystemPartnerId, alreadyExists: true }
  }

  const meta = (lead.metadata || {}) as Record<string, unknown>
  const code = normalizeEcosystemCategory(safeString(meta.categorySlug) || lead.category || '')
  const categorySlug = code ? ecosystemCategoryToSlug(code) : lead.category?.includes('-') ? lead.category : ''

  if (!categorySlug) throw new Error('Missing ecosystem category')

  const category = await prisma.ecosystemCategory.findUnique({
    where: { slug: categorySlug },
    select: { id: true, slug: true },
  })
  if (!category) throw new Error('Ecosystem category not found')

  const contact = pickContact(meta)
  if (!contact.email) throw new Error('Applicant email is required')

  const existing = await prisma.ecosystemPartner.findFirst({
    where: { categoryId: category.id, contactEmail: contact.email },
    select: { id: true },
  })

  if (existing?.id) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { ecosystemPartnerId: existing.id, status: 'ONBOARDED' },
    })
    return { partnerId: existing.id, alreadyExists: true }
  }

  const partnerName = contact.companyName || contact.name
  const baseSlug = slugifyPartnerName(partnerName)
  let slug = baseSlug
  if (baseSlug) {
    const collision = await prisma.ecosystemPartner.findFirst({
      where: { categoryId: category.id, slug: baseSlug },
      select: { id: true },
    })
    if (collision) slug = `${baseSlug}-${Date.now().toString(36)}`
  }

  const partner = await prisma.ecosystemPartner.create({
    data: {
      categoryId: category.id,
      name: partnerName,
      slug: slug || null,
      contactPerson: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone || null,
      logo: contact.logoUrl || null,
      shortDescription: (safeString((meta.offerDetails as Record<string, unknown>)?.usp) || '').slice(0, 180) || null,
      description: safeString((meta.offerDetails as Record<string, unknown>)?.differentiators) || null,
      categoryData: meta.offerDetails ? (meta.offerDetails as object) : undefined,
      status: 'APPROVED',
      isVerified: true,
      isActive: true,
    },
    select: { id: true, slug: true },
  })

  revalidatePartnerSurfaces(category.slug, partner.slug)

  await prisma.lead.update({
    where: { id: leadId },
    data: { ecosystemPartnerId: partner.id, status: 'ONBOARDED' },
  })

  const applicationId = lead.sourceId || lead.legacyId
  if (applicationId) {
    await prisma.ecosystemPartnerApplication
      .update({
        where: { id: applicationId },
        data: { stage: 'ONBOARDED' },
      })
      .catch(() => null)
  }

  return { partnerId: partner.id, alreadyExists: false }
}

