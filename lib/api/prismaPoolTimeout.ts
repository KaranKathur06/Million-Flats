import { NextResponse } from 'next/server'

export function prismaPoolTimeoutResponse(message: string) {
  return NextResponse.json(
    { success: false, message },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': '3',
      },
    },
  )
}
