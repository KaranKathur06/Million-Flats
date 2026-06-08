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
  '/agent/verify',
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Global redirect rule: admin-panel roles should never see landing page
  // Trigger only for '/' to avoid impacting public pages like /buy, /rent, etc.
  // ─────────────────────────────────────────────────────────────────────────────
  const isRoot = pathname === '/'
  const isAdminPanelRole = role === 'VERIFIER' || role === 'MODERATOR' || role === 'ADMIN' || role === 'SUPERADMIN'
  if (isRoot && roleRaw && isAdminPanelRole) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }

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
    if (role !== 'VERIFIER' && role !== 'MODERATOR' && role !== 'ADMIN' && role !== 'SUPERADMIN') {
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

    // Pages always accessible regardless of status
    const isAlwaysAllowed =
      pathname.startsWith('/agent/verification') ||
      pathname.startsWith('/agent/verify') ||
      pathname.startsWith('/agent/profile') ||
      pathname.startsWith('/agent/subscription') ||
      pathname.startsWith('/agent/settings') ||
      pathname.startsWith('/agent/onboarding') ||
      pathname === '/agent/on-hold' ||
      pathname === '/agent/rejected' ||
      pathname === '/agent/suspended'

    // Pages that require APPROVED status
    const isApprovalGated =
      pathname.startsWith('/agent/properties') ||
      pathname.startsWith('/agent/leads') ||
      pathname.startsWith('/agent/clients') ||
      pathname.startsWith('/agent/deals') ||
      pathname.startsWith('/agent/analytics')

    // ── State Machine Redirects ──

    // REGISTERED: email not verified yet → send to verify page
    if (agentStatus === 'REGISTERED' || agentStatus === '') {
      if (!isAlwaysAllowed) {
        if (!emailVerified) {
          const url = req.nextUrl.clone()
          url.pathname = '/agent/verify-email'
          url.search = ''
          return NextResponse.redirect(url)
        } else {
          // Email verified but status not updated yet, go to onboarding
          if (pathname !== '/agent/onboarding' && !pathname.startsWith('/agent/onboarding/')) {
            const url = req.nextUrl.clone()
            url.pathname = '/agent/onboarding'
            url.search = ''
            return NextResponse.redirect(url)
          }
        }
      }
    }

    // EMAIL_VERIFIED: must complete onboarding form
    if (agentStatus === 'EMAIL_VERIFIED') {
      if (!pathname.startsWith('/agent/onboarding') && !isAlwaysAllowed) {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/onboarding'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }

    // PROFILE_INCOMPLETE: must complete profile
    if (agentStatus === 'PROFILE_INCOMPLETE') {
      if (!pathname.startsWith('/agent/profile') && !pathname.startsWith('/agent/onboarding') && !isAlwaysAllowed) {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/profile'
        url.search = '?notice=complete_profile'
        return NextResponse.redirect(url)
      }
    }

    // PROFILE_COMPLETED: must upload documents
    if (agentStatus === 'PROFILE_COMPLETED') {
      if (!pathname.startsWith('/agent/verification') && !pathname.startsWith('/agent/profile') && !isAlwaysAllowed) {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/verification'
        url.search = '?notice=upload_documents'
        return NextResponse.redirect(url)
      }
    }

    // DOCUMENTS_UPLOADED / UNDER_REVIEW: redirect to on-hold page
    if (agentStatus === 'DOCUMENTS_UPLOADED' || agentStatus === 'UNDER_REVIEW') {
      if (isApprovalGated) {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/on-hold'
        url.search = `reason=${agentStatus.toLowerCase()}`
        return NextResponse.redirect(url)
      }
    }

    // REJECTED: forced to rejected page
    if (agentStatus === 'REJECTED') {
      if (pathname !== '/agent/rejected' && !pathname.startsWith('/agent/rejected/')) {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/rejected'
        url.search = ''
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    // SUSPENDED: forced to suspended page
    if (agentStatus === 'SUSPENDED') {
      if (pathname !== '/agent/suspended') {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/suspended'
        url.search = ''
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    // APPROVED: block property creation if subscription expired
    if (agentStatus === 'APPROVED') {
      if (
        subscriptionStatus === 'EXPIRED' &&
        (pathname === '/agent/properties/add' || pathname.startsWith('/agent/properties/add/'))
      ) {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/subscription'
        url.search = 'reason=subscription_expired'
        return NextResponse.redirect(url)
      }
      // Redirect approved agents away from hold/rejected pages
      if (pathname === '/agent/on-hold' || pathname === '/agent/rejected' || pathname === '/agent/suspended') {
        const url = req.nextUrl.clone()
        url.pathname = '/agent/dashboard'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }

    // For non-APPROVED agents, gate approval-required pages
    if (isApprovalGated && agentStatus !== 'APPROVED') {
      const url = req.nextUrl.clone()
      url.pathname = '/agent/on-hold'
      url.search = 'reason=not_approved'
      return NextResponse.redirect(url)
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
    '/',
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
