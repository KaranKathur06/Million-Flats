import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function normalizePhone(v: string) {
  return v.replace(/[^0-9+]/g, '').trim()
}

const MIN_BIO_LENGTH = 150

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const limit = await checkAdminRateLimit({
      performedByUserId: auth.userId,
      action: 'ADMIN_AGENT_GO_LIVE',
      windowMs: 60_000,
      max: 20,
    })
    if (!limit.ok) {
      return bad('Too many requests', 429)
    }

    const agentId = String(params?.id || '').trim()
    if (!agentId) return bad('Not found', 404)

    const agent = await (prisma as any).agent.findFirst({
      where: { id: agentId },
      include: { user: true },
    })

    if (!agent?.id) return bad('Not found', 404)

    const beforeState = {
      approved: Boolean(agent.approved),
      profileStatus: String(agent?.profileStatus || 'DRAFT').toUpperCase(),
      userRole: String(agent?.user?.role || ''),
      userStatus: String(agent?.user?.status || 'ACTIVE'),
      profileCompletion: Number(agent?.profileCompletion || 0),
    }

    const profileStatus = String(agent?.profileStatus || 'DRAFT').toUpperCase()
    if (profileStatus !== 'VERIFIED') {
      return bad('Agent must be VERIFIED before going live', 409)
    }

    if (!agent.approved) {
      return bad('Agent must be approved before going live', 409)
    }

    const userStatus = String(agent?.user?.status || 'ACTIVE').toUpperCase()
    if (userStatus !== 'ACTIVE') {
      return bad('User is not active', 409)
    }

    const license = safeString(agent?.license)
    const phone = normalizePhone(safeString(agent?.user?.phone))
    const bio = safeString(agent?.bio)
    const photo = safeString(agent?.profilePhoto)

    const errors: Record<string, string> = {}
    if (!license) errors.license = 'License number is required.'
    if (!phone || phone.length < 8) errors.phone = 'Phone number is required.'
    if (!bio || bio.length < MIN_BIO_LENGTH) errors.bio = `Bio must be at least ${MIN_BIO_LENGTH} characters.`
    if (!photo) errors.photo = 'Profile photo is required.'

    const completion = Number(agent?.profileCompletion || 0)
    if (!Number.isFinite(completion) || completion < 40) {
      errors.completion = 'Profile completion must be at least 40%.'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, message: 'Profile incomplete', errors }, { status: 400 })
    }

    const updated = await (prisma as any).agent.update({
      where: { id: agentId },
      data: {
        profileStatus: 'LIVE',
        user: { update: { role: 'AGENT' } },
      } as any,
      select: { id: true, approved: true, profileStatus: true, user: { select: { role: true } } },
    })

    const afterState = {
      approved: Boolean(updated.approved),
      profileStatus: String(updated?.profileStatus || '').toUpperCase(),
      userRole: String(updated?.user?.role || ''),
      userStatus: userStatus,
      profileCompletion: completion,
    }

    await writeAuditLog({
      entityType: 'AGENT',
      entityId: agentId,
      action: 'ADMIN_AGENT_GO_LIVE',
      performedByUserId: auth.userId,
      ipAddress: getIp(req),
      beforeState,
      afterState,
      meta: { actor: 'admin' },
    })

    return NextResponse.json({ success: true, agent: updated })
  } catch (err: any) {
    const message = err?.message ? String(err.message) : 'Unexpected error'
    const name = err?.name ? String(err.name) : undefined
    const code = err?.code ? String(err.code) : undefined
    console.error('ADMIN_AGENT_GO_LIVE failed', { name, code, message })
    return NextResponse.json(
      { success: false, message: 'Go Live failed', error: { name, code, message } },
      { status: 500 }
    )
  }
}
