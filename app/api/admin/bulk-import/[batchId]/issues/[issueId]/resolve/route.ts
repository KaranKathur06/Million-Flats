import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { resolveImportIssue } from '@/lib/imports/core'

export async function POST(req: Request, { params }: { params: { batchId: string; issueId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    const body = await req.json().catch(() => ({}))
    const state = body.state === 'IGNORED' ? 'IGNORED' : body.state === 'RESOLVED' ? 'RESOLVED' : null
    if (!state) return NextResponse.json({ success: false, message: 'state must be RESOLVED or IGNORED.' }, { status: 400 })
    const result = await resolveImportIssue({ batchId: params.batchId, issueId: params.issueId, userId: auth.userId, state, note: body.note })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Issue resolution failed.' }, { status: 409 })
  }
}
