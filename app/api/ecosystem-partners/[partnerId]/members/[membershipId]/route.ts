import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { changePartnerMember, PartnerAccessError } from '@/lib/ecosystem/membership'

const ChangeSchema = z.object({ role: z.enum(['ADMIN', 'MEMBER']).optional() }).refine(
  (value) => Boolean(value.role),
  'A role is required.'
)

export async function PATCH(
  request: Request,
  { params }: { params: { partnerId: string; membershipId: string } }
) {
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor) return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })
  const parsed = ChangeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'A valid partner role is required.' }, { status: 400 })
  try {
    const membership = await changePartnerMember({
      partnerId: params.partnerId,
      membershipId: params.membershipId,
      actor,
      role: parsed.data.role,
    })
    return NextResponse.json({ success: true, data: { id: membership.id, role: membership.role } })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-members] Unable to change membership', error)
    return NextResponse.json({ success: false, message: 'Unable to update partner member.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { partnerId: string; membershipId: string } }
) {
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor) return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })
  try {
    await changePartnerMember({
      partnerId: params.partnerId,
      membershipId: params.membershipId,
      actor,
      revoke: true,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-members] Unable to revoke membership', error)
    return NextResponse.json({ success: false, message: 'Unable to revoke partner member.' }, { status: 500 })
  }
}
