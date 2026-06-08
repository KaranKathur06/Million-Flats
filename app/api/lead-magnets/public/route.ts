import { NextResponse } from 'next/server'
import { getPopupLeadMagnet } from '@/lib/leadMagnets/server'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  try {
    const leadMagnet = await getPopupLeadMagnet()
    return NextResponse.json(
      { success: true, data: leadMagnet },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (error) {
    console.error('[GET /api/lead-magnets/public] failed:', error)
    return NextResponse.json({ success: false, data: null }, { status: 500 })
  }
}
