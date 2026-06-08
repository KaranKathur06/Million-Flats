import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLead } from '@/lib/leads/createLead'
import { notifyUserThreeDTourReceived } from '@/lib/leads/notifications'
import {
  AREA_UNIT_OPTIONS,
  BUDGET_RANGE_OPTIONS,
  formatPropertySize,
  INQUIRY_TYPE_OPTIONS,
  LEAD_SOURCE_VALUES,
  PROJECT_SCOPE_OPTIONS,
  SERVICE_REQUIREMENT_OPTIONS,
  THREE_D_TOUR_PIPELINE,
  TIMELINE_OPTIONS,
  type ThreeDTourLeadMetadata,
} from '@/lib/leads/threeDTour'

export const runtime = 'nodejs'

const inquiryValues = INQUIRY_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]]
const budgetValues = BUDGET_RANGE_OPTIONS.map((o) => o.value) as [string, ...string[]]
const timelineValues = TIMELINE_OPTIONS.map((o) => o.value) as [string, ...string[]]
const scopeValues = PROJECT_SCOPE_OPTIONS.map((o) => o.value) as [string, ...string[]]
const unitValues = AREA_UNIT_OPTIONS.map((o) => o.value) as [string, ...string[]]
const serviceValues = SERVICE_REQUIREMENT_OPTIONS.map((o) => o.value)
const sourceValues = LEAD_SOURCE_VALUES as unknown as [string, ...string[]]

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(5).max(30),
  country: z.enum(['INDIA', 'UAE']).optional(),
  city: z.string().max(120).optional(),
  inquiryType: z.enum(inquiryValues),
  propertyName: z.string().max(200).optional(),
  projectName: z.string().max(200).optional(),
  propertyAddress: z.string().max(500).optional(),
  propertyCity: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  propertyCountry: z.string().max(120).optional(),
  pinCode: z.string().max(20).optional(),
  builtUpArea: z.string().max(50).optional(),
  areaUnit: z.enum(unitValues).optional(),
  serviceRequirements: z.array(z.enum(serviceValues as [string, ...string[]])).min(1),
  projectScope: z.enum(scopeValues).optional(),
  timeline: z.enum(timelineValues),
  budgetRange: z.enum(budgetValues),
  additionalNotes: z.string().max(5000).optional(),
  leadSource: z.enum(sourceValues).optional(),
  referralCode: z.string().max(64).optional(),
  referralPartnerId: z.string().max(64).optional(),
  landingUrl: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
})

function pickLeadSource(req: Request, body: z.infer<typeof BodySchema>) {
  if (body.leadSource) return body.leadSource
  const ref = String(body.referrer || req.headers.get('referer') || '').toLowerCase()
  if (body.referralCode) return 'REFERRAL'
  if (ref.includes('google')) return 'GOOGLE'
  if (ref.includes('facebook') || ref.includes('instagram') || ref.includes('linkedin')) return 'SOCIAL_MEDIA'
  return 'WEBSITE'
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: 'Please login or create an account before requesting a 3D Tour Demo.' },
      { status: 401 },
    )
  }

  const email = String((session.user as { email?: string }).email || '')
    .trim()
    .toLowerCase()
  if (!email) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true, countryIso2: true },
  })
  if (!dbUser?.id) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  if (String(dbUser.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const data = parsed.data
  const leadSource = pickLeadSource(req, data)
  const propertySize = formatPropertySize(data.builtUpArea, data.areaUnit)
  const country = data.country || (dbUser.countryIso2 === 'AE' ? 'UAE' : 'INDIA')

  const metadata: ThreeDTourLeadMetadata = {
    pipeline: THREE_D_TOUR_PIPELINE,
    inquiryType: data.inquiryType,
    city: data.city || data.propertyCity || null,
    state: data.state || null,
    propertyAddress: data.propertyAddress || null,
    projectName: data.projectName || null,
    pinCode: data.pinCode || null,
    builtUpArea: data.builtUpArea || null,
    areaUnit: data.areaUnit || null,
    serviceRequirements: data.serviceRequirements,
    projectScope: data.projectScope || null,
    leadSource,
    referralCode: data.referralCode || null,
    referralPartnerId: data.referralPartnerId || null,
    aiScoring: {
      propertySize: propertySize,
      budget: data.budgetRange,
      timeline: data.timeline,
      projectScope: data.projectScope || null,
      country: data.propertyCountry || data.city || country,
    },
  }

  const lead = await createLead({
    leadType: 'THREE_D_TOUR',
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.additionalNotes || null,
    category: data.inquiryType,
    sourceName: '3D Tour — Book Demo',
    projectOrCompany: data.projectName || data.propertyName || null,
    country,
    status: 'NEW_INQUIRY',
    userId: dbUser.id,
    propertyType: data.inquiryType,
    propertyName: data.propertyName || null,
    propertySize,
    budgetRange: data.budgetRange,
    timeline: data.timeline,
    referralCode: data.referralCode || null,
    referralPartnerId: data.referralPartnerId || null,
    landingUrl: data.landingUrl || null,
    referrer: data.referrer || null,
    metadata,
    notify: true,
  })

  await notifyUserThreeDTourReceived({ email: data.email, name: data.name }).catch(() => null)

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const email = String((session.user as { email?: string }).email || '')
    .trim()
    .toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      countryIso2: true,
      country: { select: { name: true } },
      preference: { select: { city: true, countryCode: true } },
    },
  })
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const referralCode = url.searchParams.get('ref') || url.searchParams.get('referral') || ''
  const referralPartnerId = url.searchParams.get('partner') || url.searchParams.get('referralPartnerId') || ''

  return NextResponse.json({
    success: true,
    profile: {
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      country: user.country?.name || (user.countryIso2 === 'AE' ? 'UAE' : user.countryIso2 === 'IN' ? 'India' : ''),
      city: user.preference?.city || '',
      countryCode: user.preference?.countryCode || (user.countryIso2 === 'AE' ? 'UAE' : 'INDIA'),
    },
    referralCode: referralCode.trim() || null,
    referralPartnerId: referralPartnerId.trim() || null,
  })
}
