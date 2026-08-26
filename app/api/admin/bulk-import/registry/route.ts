import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { listImportAdapters } from '@/lib/imports/registry'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  return NextResponse.json({ success: true, adapters: listImportAdapters() }, { headers: { 'Cache-Control': 'no-store' } })
}