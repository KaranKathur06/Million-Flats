import { prisma } from '@/lib/prisma'

export async function checkAdminRateLimit(input: {
  performedByUserId: string
  action: string
  windowMs: number
  max: number
}) {
  const performedByUserId = String(input.performedByUserId || '').trim()
  const action = String(input.action || '').trim()
  const windowMs = typeof input.windowMs === 'number' ? input.windowMs : 0
  const max = typeof input.max === 'number' ? input.max : 0

  if (!performedByUserId || !action || windowMs <= 0 || max <= 0) {
    return { ok: true as const, remaining: max }
  }

  const since = new Date(Date.now() - windowMs)

  const used = await (prisma as any).auditLog.count({
    where: {
      performedByUserId,
      action,
      createdAt: { gte: since },
    },
  })

  if (typeof used === 'number' && used >= max) {
    return { ok: false as const, remaining: 0 }
  }

  const remaining = typeof used === 'number' ? Math.max(0, max - used) : max
  return { ok: true as const, remaining }
}
