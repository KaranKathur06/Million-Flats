import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { batchId: string; recordId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    const body = await req.json().catch(() => ({}))
    const record = await (prisma as any).importRecord.updateMany({
      where: { id: params.recordId, batchId: params.batchId, status: { in: ['WARNING', 'ERROR', 'DUPLICATE_REVIEW'] } },
      data: {
        status: body.status === 'SKIPPED' ? 'SKIPPED' : 'READY',
        canonicalPayload: body.canonicalPayload ?? undefined,
      },
    })
    if (record.count !== 1) return NextResponse.json({ success: false, message: 'Import record not found or not resolvable.' }, { status: 404 })
    return NextResponse.json({ success: true, recordId: params.recordId, status: body.status === 'SKIPPED' ? 'SKIPPED' : 'READY', resolvedByUserId: auth.userId })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Record resolution failed.' }, { status: 500 })
  }
}
