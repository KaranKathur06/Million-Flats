import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const batch = await (prisma as any).importBatch.findUnique({ where: { id: params.batchId }, select: { id: true, status: true, totalRecords: true, readyCount: true, warningCount: true, errorCount: true, createdCount: true, skippedCount: true, failedCount: true } })
  if (!batch) return NextResponse.json({ success: false, message: 'Import batch not found.' }, { status: 404 })
  return NextResponse.json({ success: true, progress: batch })
}
