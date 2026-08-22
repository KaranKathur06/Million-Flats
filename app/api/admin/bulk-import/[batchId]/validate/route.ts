import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { analyzeImportBatch } from '@/lib/imports/core'

export async function POST(_req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    return NextResponse.json({ success: true, ...(await analyzeImportBatch({ batchId: params.batchId })) })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Validation failed.' }, { status: 409 })
  }
}
