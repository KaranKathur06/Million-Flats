import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { PartnerAccessError, savePartnerOfferings } from '@/lib/ecosystem/membership'

const OfferingsSchema = z.object({
  services: z.array(z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(800).nullable().optional(),
  }).strict()).max(50).optional(),
  locations: z.array(z.object({
    city: z.string().trim().min(2).max(120),
    region: z.string().trim().max(120).nullable().optional(),
    isPrimary: z.boolean().default(false),
  }).strict()).max(100).optional(),
}).strict().refine((value) => value.services !== undefined || value.locations !== undefined, 'Provide services or locations.')

export async function PUT(
  request: Request,
  { params }: { params: { partnerId: string } }
) {
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor) return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })
  const parsed = OfferingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Review the service and location details.' }, { status: 400 })
  try {
    const data = await savePartnerOfferings({ partnerId: params.partnerId, actor, ...parsed.data })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-offerings] Failed to save partner offerings', error)
    return NextResponse.json({ success: false, message: 'Unable to save services and locations.' }, { status: 500 })
  }
}
