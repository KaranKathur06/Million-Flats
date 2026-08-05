export function getBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.APP_URL

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return 'http://localhost:3000'
}

export function buildAbsoluteUrl(pathname: string) {
  const base = getBaseUrl()
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${path}`
}

export function isPublicAuthPath(pathname: string) {
  if (!pathname) return false
  return [
    '/admin/login',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/verified',
    '/agent/auth',
    '/developer/auth',
    '/agency/auth',
    '/user/login',
  ].some((publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`))
}

export function isProtectedRoutePath(pathname: string) {
  if (!pathname) return false

  const protectedPrefixes = [
    '/dashboard',
    '/agent',
    '/developer',
    '/agency',
    '/admin',
    '/profile',
    '/settings',
    '/properties',
    '/projects',
    '/api/auth',
    '/api/admin',
    '/ecosystem',
    '/AI',
  ]

  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
