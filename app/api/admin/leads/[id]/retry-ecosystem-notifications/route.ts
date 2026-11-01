import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import {
  EcosystemInquiryError,
  retryEcosystemInquiryNotifications,
} from '@/lib/ecosystem/inquiries'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    const result = await retryEcosystemInquiryNotifications(params.id)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof EcosystemInquiryError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[admin-ecosystem-inquiry] Notification retry failed', error)
    return NextResponse.json({ success: false, message: 'Unable to retry inquiry notifications.' }, { status: 500 })
  }
}
