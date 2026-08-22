import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { executeImport } from '@/lib/imports/core'

export async function POST(req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  const idempotencyKey = req.headers.get('Idempotency-Key')
  if (!idempotencyKey) return NextResponse.json({ success: false, message: 'Idempotency-Key is required.' }, { status: 400 })

  try {
    const result = await executeImport({ batchId: params.batchId, idempotencyKey: `${auth.userId}:${idempotencyKey}` })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    const message = error?.message || 'Import commit failed.'
    const status = /not ready|already committing/i.test(message) ? 409 : /not found/i.test(message) ? 404 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
