import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const userId = String(params?.id || '').trim()
  if (!userId) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { buyer: true, agent: true, developerProfile: true },
  })

  if (!user) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

  // Log the export action
  await writeAuditLog({
    entityType: 'USER',
    entityId: userId,
    action: 'ADMIN_USER_EXPORTED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    meta: {
      exportedAt: new Date().toISOString(),
      targetEmail: user.email,
    },
  }).catch(() => null)

  const payload = { exportedAt: new Date().toISOString(), user }

  return new NextResponse(JSON.stringify({ success: true, payload }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="user-${userId}.json"`,
    },
  })
}
