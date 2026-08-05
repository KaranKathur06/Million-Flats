import { prisma } from '@/lib/prisma'
import AuthSettingsClient from './AuthSettingsClient'

export const dynamic = 'force-dynamic'

export default async function AuthenticationSettingsPage() {
  let settings: any = null
  try {
    settings = await (prisma as any).authSettings.findUnique({
      where: { id: 'singleton' },
    })
  } catch {
    // Table may not exist yet — client will handle defaults
  }

  // Fetch recent auth audit logs
  let recentAuditLogs: any[] = []
  try {
    recentAuditLogs = await (prisma as any).auditLog.findMany({
      where: {
        entityId: 'auth-settings-singleton',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        performedByUser: {
          select: { name: true, email: true },
        },
      },
    })
  } catch {
    // Audit logs may not have this entity yet
  }

  return (
    <AuthSettingsClient
      initialSettings={settings ? JSON.parse(JSON.stringify(settings)) : null}
      recentAuditLogs={recentAuditLogs.map((l: any) => JSON.parse(JSON.stringify(l)))}
    />
  )
}
