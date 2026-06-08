import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      deprecated: true,
      message: 'Featured agents have been removed from the homepage. Use the /agents page or agent search/listing flows for discovery.',
      replacement: '/agents',
    },
    { status: 410 }
  )
}
