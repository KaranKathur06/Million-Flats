const AGENT_PUBLIC_PREFIXES = [
  '/agent/auth',
  '/agent/register',
  '/agent/forgot-password',
  '/agent/reset-password',
  '/agent/verify-email',
  '/agent/verify',
  '/agent/onboarding',
  '/agent/on-hold',
  '/agent/rejected',
  '/agent/suspended',
]

export function isAgentPublicRoute(pathname: string) {
  return AGENT_PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
