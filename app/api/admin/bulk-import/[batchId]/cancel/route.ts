import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { cancelImportBatch } from '@/lib/imports/core'

export async function POST(_req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  try {
    const result = await cancelImportBatch({ batchId: params.batchId, userId: auth.userId })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    const message = error?.message || 'Import cancellation failed.'
    const status = /not found/i.test(message) ? 404 : /cannot be cancelled/i.test(message) ? 409 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
