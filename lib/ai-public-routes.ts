/**
 * Canonical information-page roots controlled by the AI System login policy.
 * Matching is limited to these roots and their descendants; it does not open
 * other AI pages, demos, or API routes.
 */
export const AI_LOGIN_CONTROLLED_ROUTES = [
  '/ai/view',
  '/ai/shield',
  '/ai/index',
  '/ai/title',
  '/ai/pro',
  '/ai-system',
] as const

export function isAiLoginControlledRoute(pathname: string): boolean {
  const normalized = pathname.endsWith('/')
    ? pathname.slice(0, -1) || '/'
    : pathname
  const descendantPath = normalized.split('/').slice(2)

  if (descendantPath.includes('demo')) return false

  return AI_LOGIN_CONTROLLED_ROUTES.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`),
  )
}
