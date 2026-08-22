import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { invalidateImportBatch } from '@/lib/imports/core'

export async function POST(req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  try {
    const body = await req.json().catch(() => ({}))
    const change = body.change === 'ownership' ? 'ownership' : body.change === 'mapping' ? 'mapping' : null
    if (!change) return NextResponse.json({ success: false, message: 'change must be mapping or ownership.' }, { status: 400 })

    const result = await invalidateImportBatch({ batchId: params.batchId, change })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    const message = error?.message || 'Import invalidation failed.'
    const status = /not found/i.test(message) ? 404 : 409
    return NextResponse.json({ success: false, message }, { status })
  }
}
