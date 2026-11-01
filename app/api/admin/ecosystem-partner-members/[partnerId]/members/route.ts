import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { invitePartnerMember, isPlatformAdmin, PartnerAccessError } from '@/lib/ecosystem/membership'
import { prisma } from '@/lib/prisma'

const OwnerInviteSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('OWNER'),
})

export async function GET(_request: Request, { params }: { params: { partnerId: string } }) {
  const adminSession = await requireAdminSession()
  if (!adminSession.ok) {
    return NextResponse.json({ success: false, message: adminSession.message }, { status: adminSession.status })
  }
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor || !isPlatformAdmin(actor)) {
    return NextResponse.json({ success: false, message: 'Platform administrator access is required.' }, { status: 403 })
  }
  try {
    const members = await (prisma as any).ecosystemPartnerMembership.findMany({
      where: { partnerId: params.partnerId },
      select: {
        id: true, inviteEmail: true, role: true, status: true, createdAt: true, acceptedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: members }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin-ecosystem-members] Unable to list partner memberships', error)
    return NextResponse.json({ success: false, message: 'Unable to load partner members.' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { partnerId: string } }) {
  const adminSession = await requireAdminSession()
  if (!adminSession.ok) {
    return NextResponse.json({ success: false, message: adminSession.message }, { status: adminSession.status })
  }
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor || !isPlatformAdmin(actor)) {
    return NextResponse.json({ success: false, message: 'Platform administrator access is required.' }, { status: 403 })
  }
  const parsed = OwnerInviteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Enter a valid email address.' }, { status: 400 })
  try {
    const result = await invitePartnerMember({
      partnerId: params.partnerId,
      email: parsed.data.email,
      role: parsed.data.role,
      actor,
    })
    return NextResponse.json({ success: true, ...result }, { status: 202 })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[admin-ecosystem-members] Unable to invite owner', error)
    return NextResponse.json({ success: false, message: 'Unable to send owner invitation.' }, { status: 500 })
  }
}
