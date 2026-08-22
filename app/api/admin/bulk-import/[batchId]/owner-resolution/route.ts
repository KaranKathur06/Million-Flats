import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { resolveImportOwner } from '@/lib/imports/core'

export async function POST(req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    const body = await req.json().catch(() => ({}))
    const result = await resolveImportOwner({ batchId: params.batchId, agentId: body.agentId, userId: auth.userId })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    const message = error?.message || 'Owner resolution failed.'
    return NextResponse.json({ success: false, message }, { status: /not found|does not exist/i.test(message) ? 404 : 409 })
  }
}
