import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { rollbackImportBatch } from '@/lib/imports/core'

export async function POST(_req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json({ success: true, ...(await rollbackImportBatch({ batchId: params.batchId, userId: auth.userId })) })
  } catch (error: any) {
    const message = error?.message || 'Rollback failed.'
    return NextResponse.json({ success: false, message }, { status: /not found/i.test(message) ? 404 : /forbidden|blocked|only|limited|no newly/i.test(message) ? 409 : 500 })
  }
}