import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getRedirectPath } from '@/lib/auth/getRedirectPath'
import { normalizeRole } from '@/lib/rbac'

function getLoginPath(pathname: string) {
  if (pathname === '/agent-portal' || pathname.startsWith('/agent-portal/')) return '/auth/login'
  if (pathname === '/agent/dashboard' || pathname.startsWith('/agent/dashboard/')) return '/auth/login'
  if (pathname === '/agent/onboarding' || pathname.startsWith('/agent/onboarding/')) return '/auth/login'
  if (pathname === '/properties/new' || pathname.startsWith('/properties/new/')) return '/auth/login'
  return '/auth/login'
}

function base64UrlToUint8Array(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64
  const raw = atob(padded)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input) as any
  } catch {
    return null
  }
}

async function verifyLegacyJwt(token: string, secret: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, sigB64] = parts
  const headerJson = new TextDecoder().decode(base64UrlToUint8Array(headerB64))
  const header = safeJsonParse(headerJson)
  if (!header || header.alg !== 'HS256') return null

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = base64UrlToUint8Array(sigB64)

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const ok = await crypto.subtle.verify('HMAC', key, signature, data)
  if (!ok) return null

  const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(payloadB64))
  const payload = safeJsonParse(payloadJson)
  if (!payload) return null

  if (payload.exp && typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000)
    if (now >= payload.exp) return null
  }

  return payload
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    pathname === '/auth/login' ||
    pathname.startsWith('/auth/login/') ||
    pathname === '/auth/register' ||
    pathname.startsWith('/auth/register/') ||
    pathname === '/auth/user/login' ||
    pathname.startsWith('/auth/user/login/') ||
    pathname === '/auth/user/register' ||
    pathname.startsWith('/auth/user/register/') ||
    pathname === '/auth/agent/login' ||
    pathname.startsWith('/auth/agent/login/') ||
    pathname === '/auth/agent/register' ||
    pathname.startsWith('/auth/agent/register/') ||
    pathname === '/user/login' ||
    pathname.startsWith('/user/login/') ||
    pathname === '/user/register' ||
    pathname.startsWith('/user/register/') ||
    pathname === '/user/forgot-password' ||
    pathname.startsWith('/user/forgot-password/') ||
    pathname === '/user/reset-password' ||
    pathname.startsWith('/user/reset-password/') ||
    pathname === '/agent/login' ||
    pathname.startsWith('/agent/login/') ||
    pathname === '/agent/register' ||
    pathname.startsWith('/agent/register/') ||
    pathname === '/agent/forgot-password' ||
    pathname.startsWith('/agent/forgot-password/')
  ) {
    return NextResponse.next()
  }

  const isAdminProtected = pathname === '/admin' || pathname.startsWith('/admin/')
  const isAgentProtected = pathname === '/agent' || pathname.startsWith('/agent/')
  const isDashboardProtected = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isEcosystemAdminProtected = pathname === '/ecosystem/admin' || pathname.startsWith('/ecosystem/admin/')

  const isProtected = isAdminProtected || isAgentProtected || isDashboardProtected || isEcosystemAdminProtected

  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  const nextAuthToken = secret ? await getToken({ req, secret }) : null

  let roleRaw = String((nextAuthToken as any)?.role || '').toUpperCase()

  if (!roleRaw) {
    const legacyCookie = req.cookies.get('token')?.value
    const legacySecret = process.env.JWT_SECRET
    if (legacyCookie && legacySecret) {
      const legacyPayload = await verifyLegacyJwt(legacyCookie, legacySecret)
      roleRaw = String((legacyPayload as any)?.role || '').toUpperCase()
    }
  }

  const role = normalizeRole(roleRaw)

  if (isProtected && !roleRaw) {
    const url = req.nextUrl.clone()
    url.pathname = getLoginPath(pathname)
    url.search = `next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  if (isAdminProtected || isEcosystemAdminProtected) {
    if (!(role === 'ADMIN' || role === 'SUPERADMIN')) {
      const url = req.nextUrl.clone()
      url.pathname = '/unauthorized'
      url.search = 'reason=admin_only'
      return NextResponse.redirect(url)
    }
  }

  if (isAgentProtected) {
    if (role !== 'AGENT') {
      const url = req.nextUrl.clone()
      url.pathname = '/unauthorized'
      url.search = 'reason=agent_only'
      return NextResponse.redirect(url)
    }
  }

  if (isDashboardProtected) {
    if (role !== 'USER') {
      const url = req.nextUrl.clone()
      url.pathname = getRedirectPath(role)
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/agent/:path*',
    '/user/dashboard/:path*',
    '/user/profile/:path*',
    '/ecosystem/admin/:path*',
  ],
}
