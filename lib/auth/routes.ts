const DEFAULT_PUBLIC_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/user/login',
  '/auth/user/register',
  '/auth/agent/register',
  '/auth/developer/forgot-password',
  '/auth/agency/forgot-password',
  '/user/login',
  '/user/register',
  '/user/onboarding',
  '/user/forgot-password',
  '/user/reset-password',
  '/user/verify',
  '/user/verify-email',
  '/user/verify-otp',
  '/agent/register',
  '/agent/auth',
  '/agent/forgot-password',
  '/agent/reset-password',
  '/agent/verify-email',
  '/agent/verify',
  '/agent/verify-otp',
  '/developer/auth',
  '/developer/login',
  '/developer/register',
  '/developer/forgot-password',
  '/developer/reset-password',
  '/developer/verify-email',
  '/developer/verify',
  '/developer/verify-otp',
  '/agency/auth',
  '/agency/login',
  '/agency/register',
  '/agency/forgot-password',
  '/agency/reset-password',
  '/agency/verify-email',
  '/agency/verify-otp',
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
]

const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/settings',
  '/users',
  '/agents',
  '/projects',
  '/leads',
  '/blogs',
  '/financial',
  '/agent',
  '/developer',
  '/agency',
]

const PUBLIC_ROUTE_PREFIXES = ['/about', '/contact', '/blog', '/blogs', '/buy', '/rent', '/sell', '/properties', '/projects', '/agents', '/developers', '/agencies']

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

export function isPublicAuthPath(pathname: string) {
  const normalized = normalizePath(pathname)
  return DEFAULT_PUBLIC_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
}

export function isProtectedRoutePath(pathname: string) {
  const normalized = normalizePath(pathname)

  if (normalized === '/' || normalized === '/auth' || normalized === '/auth/login') {
    return false
  }

  const isProtectedByPrefix = PROTECTED_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
  if (isProtectedByPrefix) return true

  return false
}

export function isPublicRoutePath(pathname: string) {
  const normalized = normalizePath(pathname)
  if (normalized === '/') return true
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
}

function resolveBaseUrlCandidate() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.APP_URL,
    process.env.SITE_URL,
    process.env.AUTH_URL,
    process.env.EMAIL_BASE_URL,
    process.env.API_BASE_URL,
    process.env.NEXTAUTH_URL,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().replace(/\/$/, '')
    }
  }

  return 'http://localhost:3000'
}

export function getBaseUrl() {
  return resolveBaseUrlCandidate()
}

export function buildAbsoluteUrl(pathname: string) {
  const base = getBaseUrl()
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${normalizedPath}`
}
