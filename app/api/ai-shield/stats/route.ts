import { NextResponse } from 'next/server'
import { getAiShieldPlatformStats } from '@/lib/aishield/projects'

export const revalidate = 900

export async function GET() {
  try {
    const stats = await getAiShieldPlatformStats()
    return NextResponse.json(
      { success: true, stats },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
    )
  } catch (err) {
    console.error('[GET /api/ai-shield/stats]', err)
    return NextResponse.json({ success: false, message: 'Unable to load stats' }, { status: 500 })
  }
}
