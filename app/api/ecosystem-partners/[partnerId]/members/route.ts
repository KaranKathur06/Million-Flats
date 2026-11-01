import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import {
  invitePartnerMember,
  listPartnerMemberships,
  PartnerAccessError,
} from '@/lib/ecosystem/membership'

const InviteSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(['ADMIN', 'MEMBER']),
})

export async function GET(
  _request: Request,
  { params }: { params: { partnerId: string } }
) {
  try {
    const members = await listPartnerMemberships(params.partnerId)
    return NextResponse.json({ success: true, data: members }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-members] Unable to list memberships', error)
    return NextResponse.json({ success: false, message: 'Unable to load partner members.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { partnerId: string } }
) {
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor) return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })
  const parsed = InviteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Enter a valid email and partner role.' }, { status: 400 })

  try {
    const result = await invitePartnerMember({ partnerId: params.partnerId, ...parsed.data, actor })
    return NextResponse.json({ success: true, ...result }, { status: 202 })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-members] Unable to invite member', error)
    return NextResponse.json({ success: false, message: 'Unable to send partner invitation.' }, { status: 500 })
  }
}
