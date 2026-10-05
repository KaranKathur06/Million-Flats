import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { analyzeImportBatch, ImportAnalysisConflictError } from '@/lib/imports/core'

const bodySchema = z.object({
  ownerAgentId: z.string().trim().min(1).nullable().optional(),
  recoveryMode: z.enum(['START', 'RECOVER', 'RETRY']).optional(),
})

export async function POST(req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid import analysis request.' }, { status: 400 })
    }
    const result = await analyzeImportBatch({
      batchId: params.batchId,
      ownerAgentId: parsed.data.ownerAgentId,
      requestMode: parsed.data.recoveryMode,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof ImportAnalysisConflictError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 409 })
    }
    console.error('[POST /api/admin/bulk-import/[batchId]/analyze]', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Import analysis failed.',
    }, { status: 500 })
  }
}
