import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import {
  isPlatformAdmin,
  PartnerAccessError,
  revokePartnerMemberByAdmin,
  setPartnerMemberRoleByAdmin,
} from '@/lib/ecosystem/membership'

const RoleSchema = z.object({ role: z.enum(['OWNER', 'ADMIN', 'MEMBER']) })

export async function PATCH(
  request: Request,
  { params }: { params: { partnerId: string; membershipId: string } }
) {
  const adminSession = await requireAdminSession()
  if (!adminSession.ok) {
    return NextResponse.json({ success: false, message: adminSession.message }, { status: adminSession.status })
  }
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor || !isPlatformAdmin(actor)) {
    return NextResponse.json({ success: false, message: 'Platform administrator access is required.' }, { status: 403 })
  }
  const parsed = RoleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Choose a valid partner role.' }, { status: 400 })
  try {
    const membership = await setPartnerMemberRoleByAdmin({
      partnerId: params.partnerId,
      membershipId: params.membershipId,
      role: parsed.data.role,
      actor,
    })
    return NextResponse.json({ success: true, data: { id: membership.id, role: membership.role } })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[admin-ecosystem-members] Unable to change partner role', error)
    return NextResponse.json({ success: false, message: 'Unable to change partner role.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { partnerId: string; membershipId: string } }
) {
  const adminSession = await requireAdminSession()
  if (!adminSession.ok) {
    return NextResponse.json({ success: false, message: adminSession.message }, { status: adminSession.status })
  }
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor || !isPlatformAdmin(actor)) {
    return NextResponse.json({ success: false, message: 'Platform administrator access is required.' }, { status: 403 })
  }
  try {
    await revokePartnerMemberByAdmin({
      partnerId: params.partnerId,
      membershipId: params.membershipId,
      actor,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[admin-ecosystem-members] Unable to revoke membership', error)
    return NextResponse.json({ success: false, message: 'Unable to revoke partner member.' }, { status: 500 })
  }
}
