import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { processStorageCleanupJobs } from '@/lib/storageCleanup'
import { processVideoReelMaintenance } from '@/lib/videoReels/maintenance'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function run(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCronAuth) {
    const session = await getServerSession(authOptions)
    const role = normalizeRole((session?.user as any)?.role)
    if (!session?.user || !hasMinRole(role, 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const [result, videoReels] = await Promise.all([
      processStorageCleanupJobs(50),
      processVideoReelMaintenance(25),
    ])
    return NextResponse.json({ success: true, ...result, videoReels })
  } catch (error) {
    console.error('[storage cleanup] worker failed', error)
    return NextResponse.json({ success: false, message: 'Storage cleanup failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return run(req)
}

export async function GET(req: NextRequest) {
  return run(req)
}