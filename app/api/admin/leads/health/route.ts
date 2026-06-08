import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getLeadSyncHealth } from '@/lib/leads/queries'

export const runtime = 'nodejs'

/** Diagnostic endpoint — admin only. Compare dashboard vs table counts. */
export async function GET() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (!hasMinRole(role, 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const health = await getLeadSyncHealth()

  return NextResponse.json({
    success: true,
    health: {
      totalLeads: health.totalLeads,
      threeDTourLeads: health.threeDTourLeads,
      projectLeads: health.projectLeads,
      contactLeads: health.contactLeads,
      ecosystemLeads: health.ecosystemLeads,
      lastLeadCreated: health.lastLeadCreated,
      lastLeadUpdated: health.lastLeadUpdated,
      leadTableCount: health.tableCountUnfiltered,
      dashboardCount: health.dashboardTotal,
      difference: health.difference,
      inSync: health.inSync,
    },
  })
}
