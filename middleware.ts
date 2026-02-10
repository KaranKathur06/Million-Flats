import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getHomeRouteForRole, isRoleAllowedForShell } from '@/lib/roleHomeRoute'

function getLoginPath(pathname: string) {
  if (pathname === '/agent-portal' || pathname.startsWith('/agent-portal/')) return '/agent/login'
  if (pathname === '/agent/dashboard' || pathname.startsWith('/agent/dashboard/')) return '/agent/login'
  if (pathname === '/agent/onboarding' || pathname.startsWith('/agent/onboarding/')) return '/agent/login'
  if (pathname === '/properties/new' || pathname.startsWith('/properties/new/')) return '/agent/login'
  return pathname.startsWith('/agent') ? '/agent/login' : '/user/login'
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

  const isAgentProtected =
    pathname === '/agent-portal' ||
    pathname.startsWith('/agent-portal/') ||
    pathname === '/agent/dashboard' ||
    pathname.startsWith('/agent/dashboard/') ||
    pathname === '/agent/profile' ||
    pathname.startsWith('/agent/profile/') ||
    pathname === '/properties/new' ||
    pathname.startsWith('/properties/new/')

  const isAdminProtected = pathname === '/admin' || pathname.startsWith('/admin/')

  const isUserOnlyFeature =
    pathname === '/market-analysis' ||
    pathname.startsWith('/market-analysis/') ||
    pathname === '/explore-3d' ||
    pathname.startsWith('/explore-3d/') ||
    pathname === '/tokenized' ||
    pathname.startsWith('/tokenized/')

  const isUserProtected =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/user/dashboard' ||
    pathname.startsWith('/user/dashboard/') ||
    pathname === '/user/profile' ||
    pathname.startsWith('/user/profile/') ||
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    isUserOnlyFeature

  const isAgentOnboarding = pathname === '/agent/onboarding' || pathname.startsWith('/agent/onboarding/')

  const isVerix = pathname === '/verix' || pathname.startsWith('/verix/')

  if (!isAgentProtected && !isAdminProtected && !isUserProtected && !isAgentOnboarding && !isVerix) {
    return NextResponse.next()
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  const nextAuthToken = secret ? await getToken({ req, secret }) : null

  let role = String((nextAuthToken as any)?.role || '').toUpperCase()
  const accountStatus = String((nextAuthToken as any)?.status || 'ACTIVE').toUpperCase()

  if (!role) {
    const legacyCookie = req.cookies.get('token')?.value
    const legacySecret = process.env.JWT_SECRET
    if (legacyCookie && legacySecret) {
      const legacyPayload = await verifyLegacyJwt(legacyCookie, legacySecret)
      role = String((legacyPayload as any)?.role || '').toUpperCase()
    }
  }

  if (!role) {
    const url = req.nextUrl.clone()
    url.pathname = getLoginPath(pathname)
    if (isVerix) {
      const next = `${pathname}${req.nextUrl.search || ''}`
      url.search = `next=${encodeURIComponent(next)}`
    } else if (isUserOnlyFeature) {
      const next = `${pathname}${req.nextUrl.search || ''}`
      url.search = `next=${encodeURIComponent(next)}`
    } else if (isAdminProtected || pathname === '/properties/new' || pathname.startsWith('/properties/new/')) {
      const next = `${pathname}${req.nextUrl.search || ''}`
      url.search = `next=${encodeURIComponent(next)}`
    } else {
      url.search = ''
    }
    return NextResponse.redirect(url)
  }

  const isAdminOrHigher = role === 'ADMIN' || role === 'SUPERADMIN'
  if (isAdminProtected && !isAdminOrHigher) {
    const url = req.nextUrl.clone()
    url.pathname = getHomeRouteForRole(role)
    url.search = 'error=admin_only'
    return NextResponse.redirect(url)
  }

  if (isAgentProtected && role === 'AGENT' && accountStatus !== 'ACTIVE') {
    const url = req.nextUrl.clone()
    url.pathname = '/agent/login'
    url.search = 'error=account_disabled'
    return NextResponse.redirect(url)
  }

  if (isVerix && role === 'AGENT') {
    const url = req.nextUrl.clone()
    url.pathname = '/agent-portal'
    url.search = 'warning=restricted'
    return NextResponse.redirect(url)
  }

  if (isAgentProtected && role !== 'AGENT') {
    const url = req.nextUrl.clone()
    url.pathname = getHomeRouteForRole(role)
    url.search = 'error=agent_only'
    return NextResponse.redirect(url)
  }

  if ((pathname === '/profile' || pathname.startsWith('/profile/')) && role === 'AGENT') {
    const url = req.nextUrl.clone()
    url.pathname = '/agent/profile'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (isUserProtected && role === 'AGENT') {
    const url = req.nextUrl.clone()
    url.pathname = '/agent-portal'
    url.search = 'error=user_only'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/user/') && !isRoleAllowedForShell(role, 'user')) {
    const url = req.nextUrl.clone()
    url.pathname = getHomeRouteForRole(role)
    url.search = 'error=shell_mismatch'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/agent/') && !isRoleAllowedForShell(role, 'agent')) {
    const url = req.nextUrl.clone()
    url.pathname = getHomeRouteForRole(role)
    url.search = 'error=shell_mismatch'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin/') && !isRoleAllowedForShell(role, 'admin')) {
    const url = req.nextUrl.clone()
    url.pathname = getHomeRouteForRole(role)
    url.search = 'error=shell_mismatch'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/agent-portal/:path*',
    '/user/dashboard/:path*',
    '/user/profile/:path*',
    '/agent/dashboard/:path*',
    '/agent/profile/:path*',
    '/agent/onboarding/:path*',
    '/properties/new/:path*',
    '/verix/:path*',
    '/market-analysis/:path*',
    '/explore-3d/:path*',
    '/tokenized/:path*',
    '/profile/:path*',
    '/settings/:path*',
  ],
}
