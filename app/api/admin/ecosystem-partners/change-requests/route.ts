import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { isPlatformAdmin } from '@/lib/ecosystem/membership'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const adminSession = await requireAdminSession()
  if (!adminSession.ok) {
    return NextResponse.json({ success: false, message: adminSession.message }, { status: adminSession.status })
  }
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor || !isPlatformAdmin(actor)) {
    return NextResponse.json({ success: false, message: 'Platform administrator access is required.' }, { status: 403 })
  }
  try {
    const requests = await (prisma as any).ecosystemPartnerChangeRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        requestedChanges: true,
        createdAt: true,
        partner: { select: { id: true, name: true, category: { select: { title: true } } } },
        submittedBy: { select: { name: true, email: true } },
      },
    })
    return NextResponse.json({ success: true, data: requests }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin-ecosystem-change-requests] Failed to load pending changes', error)
    return NextResponse.json({ success: false, message: 'Unable to load pending profile changes.' }, { status: 500 })
  }
}
