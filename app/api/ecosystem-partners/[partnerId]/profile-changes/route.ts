import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { PartnerAccessError, submitSensitivePartnerChange } from '@/lib/ecosystem/membership'

const OptionalText = z.string().trim().max(2000).nullable()
const ChangesSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  contactPerson: z.string().trim().max(120).nullable().optional(),
  contactEmail: z.string().email().max(254).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  website: z.string().url().max(1000).nullable().optional(),
  gstNumber: z.string().trim().max(80).nullable().optional(),
  registrationNumber: z.string().trim().max(100).nullable().optional(),
  pricingRange: z.string().trim().max(200).nullable().optional(),
  categoryData: z.record(z.unknown()).optional(),
  serviceAreas: z.array(OptionalText).max(100).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one sensitive field is required.')

export async function POST(
  request: Request,
  { params }: { params: { partnerId: string } }
) {
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor) return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })
  const parsed = ChangesSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'One or more sensitive profile fields are invalid.' }, { status: 400 })
  try {
    const changeRequest = await submitSensitivePartnerChange(
      params.partnerId,
      actor,
      parsed.data as Record<string, unknown>
    )
    return NextResponse.json({ success: true, data: { id: changeRequest.id, status: changeRequest.status } }, { status: 201 })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-profile] Failed to stage partner profile change', error)
    return NextResponse.json({ success: false, message: 'Unable to submit profile changes for review.' }, { status: 500 })
  }
}
