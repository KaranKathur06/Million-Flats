import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      deprecated: true,
      message: 'Featured properties have been removed from the homepage. Use /api/projects or /api/search/projects for discovery.',
      replacement: '/api/projects',
    },
    { status: 410 }
  )
}
