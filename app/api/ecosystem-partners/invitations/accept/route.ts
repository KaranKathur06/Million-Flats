import { NextResponse } from 'next/server'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { acceptPartnerInvitation, PartnerAccessError } from '@/lib/ecosystem/membership'

export async function POST(request: Request) {
  const user = await getAuthenticatedEcosystemUser()
  if (!user) return NextResponse.json({ success: false, message: 'Sign in with a verified MillionFlats account to accept this invitation.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''
  try {
    const result = await acceptPartnerInvitation(token, user)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-invitation] Unable to accept invitation', error)
    return NextResponse.json({ success: false, message: 'Unable to accept partner invitation.' }, { status: 500 })
  }
}
