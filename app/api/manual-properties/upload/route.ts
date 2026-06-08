import { NextResponse } from 'next/server'
 

export const runtime = 'nodejs'

export async function POST(req: Request) {
  void req
  return NextResponse.json(
    {
      success: false,
      message: 'Upload endpoint deprecated. Use direct-to-storage upload flow.',
    },
    { status: 410 }
  )
}
