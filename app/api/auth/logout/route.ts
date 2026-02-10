import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function expireCookie(res: NextResponse, name: string) {
  res.cookies.set({
    name,
    value: '',
    path: '/',
    expires: new Date(0),
  })
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true })

  expireCookie(res, 'next-auth.session-token')
  expireCookie(res, '__Secure-next-auth.session-token')
  expireCookie(res, 'next-auth.csrf-token')
  expireCookie(res, '__Host-next-auth.csrf-token')
  expireCookie(res, 'next-auth.callback-url')

  expireCookie(res, 'token')

  return res
}
