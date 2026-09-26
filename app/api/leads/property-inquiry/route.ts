import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createPropertyInquiry } from '@/lib/leads/createPropertyInquiry'

export const runtime = 'nodejs'

const InquirySchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(40).optional().nullable(),
  country: z.enum(['INDIA', 'UAE']).optional(),
  city: z.string().trim().max(120).optional().nullable(),
  inquiryType: z.string().trim().max(80).optional().nullable(),
  preferredContactMethod: z.string().trim().max(40).optional().nullable(),
  preferredContactTime: z.string().trim().max(80).optional().nullable(),
  budget: z.string().trim().max(120).optional().nullable(),
  financingRequired: z.boolean().optional().nullable(),
  purchaseTimeline: z.string().trim().max(80).optional().nullable(),
  siteVisitRequired: z.boolean().optional().nullable(),
  message: z.string().trim().max(4000).optional().nullable(),
  displayCurrency: z.enum(['INR', 'AED']).optional().nullable(),
  sourceUrl: z.string().trim().max(2000).optional().nullable(),
  utmSource: z.string().trim().max(200).optional().nullable(),
  utmMedium: z.string().trim().max(200).optional().nullable(),
  utmCampaign: z.string().trim().max(200).optional().nullable(),
  utmContent: z.string().trim().max(200).optional().nullable(),
  utmTerm: z.string().trim().max(200).optional().nullable(),
  referrer: z.string().trim().max(2000).optional().nullable(),
  website: z.string().max(0).optional(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = InquirySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Please check the required inquiry fields.' }, { status: 400 })
  }

  if (parsed.data.website) {
    return NextResponse.json({ success: true, duplicate: false, lead: null })
  }

  try {
    const result = await createPropertyInquiry(parsed.data)
    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      lead: result.lead,
      agentId: 'agentId' in result ? result.agentId : null,
    }, { status: result.duplicate ? 200 : 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit inquiry'
    if (message === 'Property not found') {
      return NextResponse.json({ success: false, message }, { status: 404 })
    }
    console.error('[property-inquiry] failed', error)
    return NextResponse.json({ success: false, message: 'Unable to submit inquiry right now.' }, { status: 500 })
  }
}