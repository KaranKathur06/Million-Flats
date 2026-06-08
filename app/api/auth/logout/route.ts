import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function expireCookie(res: NextResponse, name: string) {
  const isAlwaysSecure = name.startsWith('__Secure-') || name.startsWith('__Host-')
  res.cookies.set({
    name,
    value: '',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isAlwaysSecure || process.env.NODE_ENV === 'production',
    expires: new Date(0),
  })
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  expireCookie(res, 'next-auth.session-token')
  expireCookie(res, '__Secure-next-auth.session-token')
  expireCookie(res, 'next-auth.csrf-token')
  expireCookie(res, '__Host-next-auth.csrf-token')
  expireCookie(res, 'next-auth.callback-url')

  expireCookie(res, 'token')

  return res
}
