import { prisma } from '@/lib/prisma'

export async function checkOtpRateLimit(phone: string): Promise<{
  allowed: boolean
  retryAfter?: number
  reason?: string
}> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  try {
    const hourlyOtps = await (prisma as any).whatsAppOtp.count({
      where: {
        session: { phone },
        createdAt: { gte: hourAgo },
      },
    })

    if (hourlyOtps >= 5) {
      return { allowed: false, retryAfter: 3600, reason: 'HOURLY_LIMIT' }
    }

    const dailyOtps = await (prisma as any).whatsAppOtp.count({
      where: {
        session: { phone },
        createdAt: { gte: dayAgo },
      },
    })

    if (dailyOtps >= 20) {
      return { allowed: false, retryAfter: 86400, reason: 'DAILY_LIMIT' }
    }
  } catch {
    // If rate limit check fails, allow (fail open for availability)
  }

  return { allowed: true }
}

export async function checkSessionInitRateLimit(ipAddress: string): Promise<{
  allowed: boolean
}> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

  try {
    const recentSessions = await (prisma as any).whatsAppAuthSession.count({
      where: { ipAddress, createdAt: { gte: tenMinutesAgo } },
    })
    return { allowed: recentSessions < 10 }
  } catch {
    return { allowed: true }
  }
}
