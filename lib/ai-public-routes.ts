/**
 * lib/ai-public-routes.ts
 *
 * Canonical list of public-facing AI System™ informational pages.
 *
 * These routes are temporarily made publicly accessible without login when
 * the MF_AI_PUBLIC_PAGES environment variable is set to "true".
 *
 * SECURITY NOTES:
 *  - This allowlist covers only the informational page routes.
 *  - Protected AI API endpoints (/api/ai/*) are NOT included here.
 *  - Buyer/agent dashboards and private AI operations remain protected.
 *  - Set MF_AI_PUBLIC_PAGES=true  → AI info pages are publicly accessible.
 *  - Set MF_AI_PUBLIC_PAGES=false → AI info pages require authentication.
 *  - The flag is evaluated server-side; it cannot be bypassed client-side.
 */

/**
 * Exact canonical paths and their valid sub-paths for public AI pages.
 * Only these routes are opened; all other /ai/** paths remain under the
 * existing authorization policy.
 */
export const AI_PUBLIC_PAGE_PREFIXES: readonly string[] = [
  '/ai/view',
  '/ai/shield',
  '/ai/index',
  '/ai/title',
  '/ai/pro',
  '/ai-system',
] as const

/**
 * Returns true when MF_AI_PUBLIC_PAGES is explicitly set to "true".
 * Safe default: returns false when the variable is absent or has any
 * other value, preserving the original protected behavior.
 *
 * Evaluated on the server only (Node.js process.env).
 */
export function isAiPublicPagesEnabled(): boolean {
  return process.env.MF_AI_PUBLIC_PAGES === 'true'
}

/**
 * Returns true when the given pathname is one of the approved public
 * AI System™ informational page paths.
 *
 * Matching rules:
 *  - Exact match:   /ai/view         → true
 *  - Sub-path:      /ai/view/about   → true
 *  - Trailing slash:/ai/view/         → true
 *  - Unrelated:     /ai-admin         → false   (not substring matched)
 *  - API endpoint:  /api/ai/report    → false   (not in allowlist)
 *
 * Safe to call in middleware (Edge Runtime compatible — no Node.js APIs).
 */
export function isAiPublicPagePath(pathname: string): boolean {
  const normalized = pathname.endsWith('/')
    ? pathname.slice(0, -1) || '/'
    : pathname

  return AI_PUBLIC_PAGE_PREFIXES.some(
    (prefix) =>
      normalized === prefix || normalized.startsWith(prefix + '/'),
  )
}
