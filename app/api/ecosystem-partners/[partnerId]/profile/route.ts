import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { PartnerAccessError, updatePartnerProfile } from '@/lib/ecosystem/membership'

const ProfileSchema = z.object({
  tagline: z.string().trim().max(180).nullable().optional(),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(8000).nullable().optional(),
  locationCoverage: z.string().trim().max(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one editable field is required.')

export async function PATCH(
  request: Request,
  { params }: { params: { partnerId: string } }
) {
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor) return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })
  const parsed = ProfileSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'One or more profile fields are invalid or restricted.' }, { status: 400 })
  try {
    const data = await updatePartnerProfile(params.partnerId, actor, parsed.data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-profile] Failed to save partner profile', error)
    return NextResponse.json({ success: false, message: 'Unable to save partner profile.' }, { status: 500 })
  }
}
