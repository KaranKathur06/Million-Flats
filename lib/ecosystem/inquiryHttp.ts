import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { EcosystemInquiryError, submitEcosystemInquiry } from '@/lib/ecosystem/inquiries'

const InquirySchema = z.object({
  categorySlug: z.string().min(1).max(100).optional(),
  partnerId: z.string().min(1).max(100).optional().nullable(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(30),
  city: z.string().trim().max(120).optional().nullable(),
  propertyType: z.string().trim().max(80).optional().nullable(),
  budget: z.string().trim().max(100).optional().nullable(),
  requirement: z.string().trim().max(500).optional().nullable(),
  message: z.string().trim().min(1).max(5000),
  consentToShare: z.literal(true),
})

function getTrustedSourceIp(request: Request): string | null {
  const ip = request.headers.get('x-real-ip')?.trim()
  return ip && ip.length <= 64 ? ip : null
}

export async function handleEcosystemInquiry(
  request: Request,
  route: { categorySlug?: string; partnerSlug?: string } = {}
) {
  const user = await getAuthenticatedEcosystemUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })
  }

  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ success: false, message: 'Cross-origin requests are not allowed.' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid request origin.' }, { status: 403 })
    }
  }

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || ''
  if (!z.string().uuid().safeParse(idempotencyKey).success) {
    return NextResponse.json({ success: false, message: 'A valid inquiry request key is required.' }, { status: 400 })
  }

  const parsed = InquirySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Enter the required details and consent to share your inquiry.' }, { status: 400 })
  }

  if (parsed.data.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ success: false, message: 'Use the verified email on your MillionFlats account.' }, { status: 400 })
  }

  const sourceIp = getTrustedSourceIp(request)
  if (!sourceIp && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, message: 'Inquiry submission is temporarily unavailable.' }, { status: 503 })
  }

  try {
    const result = await submitEcosystemInquiry({
      ...parsed.data,
      categorySlug: route.categorySlug || parsed.data.categorySlug || '',
      partnerSlug: route.partnerSlug || null,
      sourcePage: new URL(request.url).pathname,
      idempotencyKey,
      userId: user.id,
      sourceIp: sourceIp || 'development',
      consentToShare: true,
    })
    return NextResponse.json(
      { success: true, ...result },
      { status: result.reused ? 200 : 201, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (error instanceof EcosystemInquiryError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-inquiry] Failed to create inquiry', error)
    return NextResponse.json({ success: false, message: 'Unable to submit inquiry right now.' }, { status: 500 })
  }
}
