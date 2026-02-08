import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { sendEmail, buildAbsoluteUrl } from '@/lib/mailer'

const RejectSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
})

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const body = await req.json().catch(() => null)
  const parsed = RejectSchema.safeParse(body)
  if (!parsed.success) return bad('Rejection reason is required.')

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id, sourceType: 'MANUAL' },
    select: {
      id: true,
      status: true,
      title: true,
      agent: { select: { user: { select: { email: true, name: true } } } },
    },
  })

  if (!property) return bad('Not found', 404)
  if (String(property.status) !== 'PENDING_REVIEW') return bad('Only pending listings can be rejected.')

  const updated = await (prisma as any).manualProperty.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: parsed.data.reason,
    } as any,
    select: { id: true, status: true },
  })

  await writeAuditLog({
    entityType: 'MANUAL_PROPERTY',
    entityId: id,
    action: 'ADMIN_REJECTED',
    performedByUserId: auth.userId,
    meta: { actor: 'admin' },
  })

  const agentEmail = safeString(property?.agent?.user?.email)
  if (agentEmail) {
    const title = safeString(property?.title) || 'Your listing'
    const agentName = safeString(property?.agent?.user?.name) || 'Agent'
    const href = buildAbsoluteUrl(`/agent/dashboard`)

    await sendEmail({
      to: agentEmail,
      subject: `Listing rejected: ${title}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <p>Hi ${agentName},</p>
          <p>Your listing <strong>${title}</strong> was rejected by our team.</p>
          <p><strong>Reason:</strong></p>
          <p>${parsed.data.reason.replace(/</g, '&lt;')}</p>
          <p>You can review and resubmit from your dashboard:</p>
          <p><a href="${href}">${href}</a></p>
        </div>
      `,
    }).catch(() => null)
  }

  return NextResponse.json({ success: true, property: updated })
}
