import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { normalizeRole } from '@/lib/rbac'

// ─── Auth page passthrough ────────────────────────────────────────────────────

const PUBLIC_AUTH_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/user/login',
  '/auth/user/register',
  '/auth/agent/login',
  '/auth/agent/register',
  '/auth/verify-otp',
  '/user/login',
  '/user/register',
  '/user/forgot-password',
  '/user/reset-password',
  '/agent/login',
  '/agent/register',
  '/agent/forgot-password',
  '/agent/verify-email',
]

function isPublicAuth(pathname: string) {
  return PUBLIC_AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

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

// ─── Main middleware ───────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Pass public auth pages through
  if (isPublicAuth(pathname)) return NextResponse.next()

  // ── Route classification ──
  const isAdminProtected           = pathname === '/admin'            || pathname.startsWith('/admin/')
  const isAgentProtected           = pathname === '/agent'            || pathname.startsWith('/agent/')
  const isDeveloperProtected       = pathname === '/developer'        || pathname.startsWith('/developer/')
  const isDashboardProtected       = pathname === '/dashboard'        || pathname.startsWith('/dashboard/')
  const isEcosystemAdminProtected  = pathname === '/ecosystem/admin'  || pathname.startsWith('/ecosystem/admin/')
  const isEcosystemDashProtected   = pathname === '/ecosystem/dashboard' || pathname.startsWith('/ecosystem/dashboard/')
  const isEcosystemManageProtected = pathname === '/ecosystem/manage' || pathname.startsWith('/ecosystem/manage/')
  const isVerixProtected           = pathname === '/verix'            || pathname.startsWith('/verix/')

  const isProtected =
    isAdminProtected ||
    isAgentProtected ||
    isDeveloperProtected ||
    isDashboardProtected ||
    isEcosystemAdminProtected ||
    isEcosystemDashProtected ||
    isEcosystemManageProtected ||
    isVerixProtected

  // ── Token extraction ──
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  const nextAuthToken = secret ? await getToken({ req, secret }) : null

  let roleRaw = String((nextAuthToken as any)?.role || '').toUpperCase()
  const emailVerified         = Boolean((nextAuthToken as any)?.emailVerified)
  const agentStatus           = String((nextAuthToken as any)?.agentStatus || '').toUpperCase()
  const subscriptionStatus    = String((nextAuthToken as any)?.subscriptionStatus || '').toUpperCase()
  const subscriptionPlan      = String((nextAuthToken as any)?.subscriptionPlan || 'BASIC').toUpperCase()

  // Legacy JWT fallback
  if (!roleRaw) {
    const legacyCookie = req.cookies.get('token')?.value
    const legacySecret = process.env.JWT_SECRET
    if (legacyCookie && legacySecret) {
      const legacyPayload = await verifyLegacyJwt(legacyCookie, legacySecret)
      roleRaw = String((legacyPayload as any)?.role || '').toUpperCase()
    }
  }

  const role = normalizeRole(roleRaw)

  // ── Unauthenticated redirect ──
  if (isProtected && !roleRaw) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    const next = `${req.nextUrl.pathname}${req.nextUrl.search || ''}`
    url.search = `next=${encodeURIComponent(next)}`
    return NextResponse.redirect(url)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN guard
  // ─────────────────────────────────────────────────────────────────────────────
  if (isAdminProtected || isEcosystemAdminProtected) {
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      const url = req.nextUrl.clone()
      url.pathname = '/unauthorized'
      url.search = 'reason=admin_only'
      return NextResponse.redirect(url)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ECOSYSTEM guard (admin only)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isEcosystemDashProtected || isEcosystemManageProtected) {
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      const url = req.nextUrl.clone()
      url.pathname = '/unauthorized'
      url.search = 'reason=admin_only'
      return NextResponse.redirect(url)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AGENT portal guard — enforces the AgentStatus state machine
  // ─────────────────────────────────────────────────────────────────────────────
  if (isAgentProtected) {
    if (role !== 'AGENT') {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/agent/login'
      const next = `${req.nextUrl.pathname}${req.nextUrl.search || ''}`
      url.search = `next=${encodeURIComponent(next)}`
      return NextResponse.redirect(url)
    }

    if (!emailVerified) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/agent/login'
      const next = `${req.nextUrl.pathname}${req.nextUrl.search || ''}`
      url.search = `next=${encodeURIComponent(next)}`
      return NextResponse.redirect(url)
    }

    // Pages accessible regardless of approval status
    const isAlwaysAllowed =
      pathname.startsWith('/agent/verification') ||
      pathname.startsWith('/agent/profile') ||
      pathname.startsWith('/agent/subscription') ||
      pathname.startsWith('/agent/settings') ||
      pathname.startsWith('/agent/onboarding') ||
      pathname === '/agent/on-hold' ||
      pathname === '/agent/rejected'

    // Pages that require APPROVED status
    const isApprovalGated =
      pathname.startsWith('/agent/properties') ||
      pathname.startsWith('/agent/leads') ||
      pathname.startsWith('/agent/clients') ||
      pathname.startsWith('/agent/deals') ||
      pathname.startsWith('/agent/analytics')

    // ── State: REJECTED ──
    if (agentStatus === 'REJECTED') {
      if (pathname !== '/agent/rejected' && !pathname.startsWith('/agent/rejected/')) {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/rejected'
        url.search = ''
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    // ── State: SUSPENDED ──
    if (agentStatus === 'SUSPENDED') {
      if (pathname !== '/agent/suspended') {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/suspended'
        url.search = ''
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    // ── Approval-gated features ──
    if (isApprovalGated && agentStatus !== 'APPROVED') {
      const url = req.nextUrl.clone()
      url.pathname = '/agent/on-hold'
      url.search = 'reason=not_approved'
      return NextResponse.redirect(url)
    }

    // ── Subscription-gated property creation ──
    // If agent is approved but subscription expired, block property creation
    if (
      agentStatus === 'APPROVED' &&
      subscriptionStatus === 'EXPIRED' &&
      (pathname === '/agent/properties/add' || pathname.startsWith('/agent/properties/add/'))
    ) {
      const url = req.nextUrl.clone()
      url.pathname = '/agent/subscription'
      url.search = 'reason=subscription_expired'
      return NextResponse.redirect(url)
    }

    // ── Redirect approved agents away from hold/rejected pages ──
    if (agentStatus === 'APPROVED') {
      if (pathname === '/agent/on-hold' || pathname === '/agent/rejected' || pathname === '/agent/suspended') {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/dashboard'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DEVELOPER portal guard
  // ─────────────────────────────────────────────────────────────────────────────
  if (isDeveloperProtected) {
    if (role !== 'DEVELOPER') {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/login'
      const next = `${req.nextUrl.pathname}${req.nextUrl.search || ''}`
      url.search = `next=${encodeURIComponent(next)}`
      return NextResponse.redirect(url)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VERIX guard — same as agent but requires approval
  // ─────────────────────────────────────────────────────────────────────────────
  if (isVerixProtected) {
    if (role !== 'AGENT') {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/agent/login'
      const next = `${req.nextUrl.pathname}${req.nextUrl.search || ''}`
      url.search = `next=${encodeURIComponent(next)}`
      return NextResponse.redirect(url)
    }
    if (!emailVerified || agentStatus !== 'APPROVED') {
      const url = req.nextUrl.clone()
      url.pathname = agentStatus === 'REJECTED' ? '/agent/rejected' : '/agent/on-hold'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BUYER/USER dashboard guard — redirect other roles to their home
  // ─────────────────────────────────────────────────────────────────────────────
  if (isDashboardProtected) {
    if (role !== 'USER' && role !== 'BUYER') {
      const url = req.nextUrl.clone()
      url.pathname = getHomeRouteForRole(role)
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
    '/developer/:path*',
    '/user/dashboard/:path*',
    '/user/profile/:path*',
    '/ecosystem/admin/:path*',
    '/ecosystem/dashboard/:path*',
    '/ecosystem/manage/:path*',
    '/verix/:path*',
  ],
}
