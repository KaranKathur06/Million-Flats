import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { uploadToS3 } from '@/lib/s3'
import { writeAuditLog } from '@/lib/audit'

export const runtime = 'nodejs'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function pickUtm(form: FormData) {
  return {
    utmSource: safeString(form.get('utm_source')) || null,
    utmMedium: safeString(form.get('utm_medium')) || null,
    utmCampaign: safeString(form.get('utm_campaign')) || null,
    utmTerm: safeString(form.get('utm_term')) || null,
    utmContent: safeString(form.get('utm_content')) || null,
    referrer: safeString(form.get('referrer')) || null,
    landingUrl: safeString(form.get('landing_url')) || null,
    userAgent: safeString(form.get('user_agent')) || null,
  }
}

function parseMulti(form: FormData, name: string) {
  const raw = form.get(name)
  if (!raw) return []
  if (typeof raw !== 'string') return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : []
  } catch {
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
}

function isAllowedUploadType(mime: string) {
  const m = (mime || '').toLowerCase()
  return (
    m === 'image/jpeg' ||
    m === 'image/png' ||
    m === 'image/webp' ||
    m === 'application/pdf'
  )
}

async function uploadOptionalFile(params: { form: FormData; name: string; folder: string }) {
  const file = params.form.get(params.name)
  if (!file || !(file instanceof File)) return null

  const mime = file.type || ''
  if (!isAllowedUploadType(mime)) {
    throw new Error('Invalid file type')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('File too large (max 8MB)')
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const uploaded = await uploadToS3({
    buffer: buf,
    folder: params.folder,
    filename: file.name || params.name,
    contentType: mime || 'application/octet-stream',
  })

  return uploaded.key
}

const CategorySchema = z.enum([
  'home-loans-finance',
  'legal-documentation',
  'property-insurance',
  'interior-design-renovation',
  'packers-movers',
  'property-management',
  'vastu-feng-shui',
  'tiles-surface-finishing',
  'hardware-architectural-fittings',
  'cement-structural',
  'smart-home-automation',
  'technology-partners',
])

type ParsedPayload = {
  category: z.infer<typeof CategorySchema>
  companyDetails: Record<string, unknown>
  contactInfo: Record<string, unknown>
  offerDetails?: Record<string, unknown>
  businessIntent?: Record<string, unknown>
}

function parsePayload(form: FormData): ParsedPayload {
  const category = CategorySchema.parse(safeString(form.get('category')))

  const companyDetails = {
    legalCompanyName: safeString(form.get('legalCompanyName')),
    companyType: safeString(form.get('companyType')),
    website: safeString(form.get('website')),
    yearsInOperation: safeString(form.get('yearsInOperation')),
    fullLegalName: safeString(form.get('fullLegalName')),
    practiceType: safeString(form.get('practiceType')),
    websiteOrLinkedIn: safeString(form.get('websiteOrLinkedIn')),
    yearsSpecialization: safeString(form.get('yearsSpecialization')),
    irdaiRegistrationNumber: safeString(form.get('irdaiRegistrationNumber')),
    businessName: safeString(form.get('businessName')),
    firmType: safeString(form.get('firmType')),
    portfolioWebsite: safeString(form.get('portfolioWebsite')),
    yearsInBusiness: safeString(form.get('yearsInBusiness')),
    legalBusinessName: safeString(form.get('legalBusinessName')),
    providerType: safeString(form.get('providerType')),
    gstNumber: safeString(form.get('gstNumber')),
    yearsInPm: safeString(form.get('yearsInPm')),
    discipline: safeString(form.get('discipline')),
    yearsPractice: safeString(form.get('yearsPractice')),
  }

  const contactInfo = {
    partnerManagerName: safeString(form.get('partnerManagerName')),
    jobTitle: safeString(form.get('jobTitle')),
    email: safeString(form.get('email')),
    phone: safeString(form.get('phone')),
    cityOfOperation: safeString(form.get('cityOfOperation')),
    primaryContactNameTitle: safeString(form.get('primaryContactNameTitle')),
    jurisdictions: safeString(form.get('jurisdictions')),
    partnershipManager: safeString(form.get('partnershipManager')),
    headquartersCity: safeString(form.get('headquartersCity')),
    principalName: safeString(form.get('principalName')),
    title: safeString(form.get('title')),
    serviceCity: safeString(form.get('serviceCity')),
    contactName: safeString(form.get('contactName')),
    registeredOfficeCity: safeString(form.get('registeredOfficeCity')),
    serviceCities: safeString(form.get('serviceCities')),
    headOfficeCity: safeString(form.get('headOfficeCity')),
    bdName: safeString(form.get('bdName')),
    city: safeString(form.get('city')),
    languages: safeString(form.get('languages')),
  }

  const offerDetails = {
    specializations: parseMulti(form, 'specializations'),
    competitiveEdge: safeString(form.get('competitiveEdge')),
    interestRateRange: safeString(form.get('interestRateRange')),
    servicesOffered: parseMulti(form, 'servicesOffered'),
    jurisdictionExpertise: safeString(form.get('jurisdictionExpertise')),
    usp: safeString(form.get('usp')),
    fixedFeePackages: safeString(form.get('fixedFeePackages')),
    products: parseMulti(form, 'products'),
    differentiators: safeString(form.get('differentiators')),
    claimSettlement: safeString(form.get('claimSettlement')),
    digitalPolicyManagement: safeString(form.get('digitalPolicyManagement')),
    quoteApi: safeString(form.get('quoteApi')),
    geographiesServed: safeString(form.get('geographiesServed')),
    designStyles: parseMulti(form, 'designStyles'),
    services: parseMulti(form, 'services'),
    signatureProject: safeString(form.get('signatureProject')),
    budgetRange: safeString(form.get('budgetRange')),
    uniqueApproach: safeString(form.get('uniqueApproach')),
    software: safeString(form.get('software')),
    visualizations: safeString(form.get('visualizations')),
    timeline: safeString(form.get('timeline')),
    serviceTypes: parseMulti(form, 'serviceTypes'),
    fleetDetails: safeString(form.get('fleetDetails')),
    packingMaterials: safeString(form.get('packingMaterials')),
    insuranceCoverage: safeString(form.get('insuranceCoverage')),
    pricingModel: safeString(form.get('pricingModel')),
    differentiator: safeString(form.get('differentiator')),
    rating: safeString(form.get('rating')),
    areasOfOperation: safeString(form.get('areasOfOperation')),
    unitsManaged: safeString(form.get('unitsManaged')),
    feeStructure: safeString(form.get('feeStructure')),
    ownerReport: safeString(form.get('ownerReport')),
    ownerPortal: safeString(form.get('ownerPortal')),
    mode: safeString(form.get('mode')),
    feeRange: safeString(form.get('feeRange')),
    philosophy: safeString(form.get('philosophy')),
    modernAdaptation: safeString(form.get('modernAdaptation')),
  }

  const businessIntent = {
    whyPartner: safeString(form.get('whyPartner')),
    monthlyLeadExpectation: safeString(form.get('monthlyLeadExpectation')),
    usesPracticeSoftware: safeString(form.get('usesPracticeSoftware')),
    avgResponseTime: safeString(form.get('avgResponseTime')),
  }

  return { category, companyDetails, contactInfo, offerDetails, businessIntent }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const payload = parsePayload(form)

    const utm = pickUtm(form)

    const appIdSeed = `${Date.now()}-${Math.random().toString(16).slice(2)}`

    const logoUrl = await uploadOptionalFile({
      form,
      name: 'logo',
      folder: `public/ecosystem/applications/${payload.category}/${appIdSeed}/logo`,
    }).catch((e) => {
      throw new Error(e instanceof Error ? e.message : 'Logo upload failed')
    })

    const certificateUrl = await uploadOptionalFile({
      form,
      name: 'certificate',
      folder: `private/ecosystem/applications/${payload.category}/${appIdSeed}/documents`,
    }).catch(() => null)

    const created = await (prisma as any).ecosystemPartnerApplication.create({
      data: {
        category: payload.category,
        stage: 'APPLIED',
        companyDetails: payload.companyDetails,
        contactInfo: payload.contactInfo,
        offerDetails: payload.offerDetails,
        businessIntent: payload.businessIntent,
        logoUrl,
        certificateUrl,
        ...utm,
      },
      select: { id: true, category: true, stage: true, createdAt: true },
    })

    const contactName =
      safeString(payload.contactInfo.partnerManagerName) ||
      safeString(payload.contactInfo.contactName) ||
      safeString(payload.contactInfo.principalName) ||
      safeString(payload.contactInfo.bdName) ||
      'Partner Applicant'
    const contactEmail = safeString(payload.contactInfo.email)
    const contactPhone = safeString(payload.contactInfo.phone)
    const companyName =
      safeString(payload.companyDetails.legalCompanyName) ||
      safeString(payload.companyDetails.fullLegalName) ||
      safeString(payload.companyDetails.businessName) ||
      safeString(payload.companyDetails.legalBusinessName) ||
      payload.category

    const { createLead, ecosystemSlugToCategory } = await import('@/lib/leads/createLead')
    const ecosystemCategory = ecosystemSlugToCategory(payload.category) || payload.category
    const businessType = safeString(payload.companyDetails.companyType) || safeString(payload.companyDetails.firmType) || 'Business'
    const city = safeString(payload.contactInfo.city) || safeString(payload.contactInfo.cityOfOperation) || safeString(payload.contactInfo.headquartersCity) || null
    const state = safeString(payload.contactInfo.serviceCity) || safeString(payload.contactInfo.registeredOfficeCity) || safeString(payload.contactInfo.headOfficeCity) || null

    await createLead({
      leadType: 'ECOSYSTEM',
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      category: ecosystemCategory,
      sourceName: companyName,
      projectOrCompany: companyName,
      country: 'INDIA',
      status: 'APPLIED',
      sourceId: created.id,
      legacyTable: 'ecosystem_partner_applications',
      legacyId: created.id,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      utmTerm: utm.utmTerm,
      utmContent: utm.utmContent,
      referrer: utm.referrer,
      landingUrl: utm.landingUrl,
      metadata: {
        categorySlug: payload.category,
        applicationId: created.id,
        companyDetails: payload.companyDetails,
        contactInfo: payload.contactInfo,
        offerDetails: payload.offerDetails,
        businessIntent: payload.businessIntent,
        logoUrl,
        certificateUrl,
        partnerCategory: payload.category,
        businessType,
        country: 'INDIA',
        state,
        city,
        verificationStatus: 'PENDING',
        leadStatus: 'NEW',
        applicationDate: new Date().toISOString(),
        adminNotes: 'Application submitted via partnership form',
        approvalStatus: 'PENDING',
      } as import('@prisma/client').Prisma.InputJsonValue,
    }).catch((e) => console.error('Lead create (ecosystem apply):', e))

    await writeAuditLog({
      entityType: 'ECOSYSTEM_PARTNER_APPLICATION',
      entityId: String(created.id),
      action: 'ECOSYSTEM_PARTNER_APPLIED',
      performedByUserId: null,
      ipAddress: getIp(req),
      beforeState: null,
      afterState: created,
      meta: { actor: 'partner', category: payload.category },
    })

    return NextResponse.json({ success: true, application: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    if (msg.includes('Invalid file type')) return bad('Invalid file type. Only JPG/PNG/WebP/PDF allowed.', 400)
    if (msg.includes('File too large')) return bad('File too large (max 8MB).', 400)
    if (msg.includes('Invalid enum value')) return bad('Invalid category', 400)
    return bad(msg || 'Internal server error', 500)
  }
}
