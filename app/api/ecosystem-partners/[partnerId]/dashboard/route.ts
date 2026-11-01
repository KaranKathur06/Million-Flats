import { NextResponse } from 'next/server'
import { PartnerAccessError, getPartnerDashboard } from '@/lib/ecosystem/membership'

export async function GET(
  _request: Request,
  { params }: { params: { partnerId: string } }
) {
  try {
    const data = await getPartnerDashboard(params.partnerId)
    return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-dashboard] Failed to load partner dashboard', error)
    return NextResponse.json({ success: false, message: 'Unable to load the partner dashboard.' }, { status: 500 })
  }
}
