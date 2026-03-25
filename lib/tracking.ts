/**
 * Clean, single-source tracking utility for Google Ads + GA4
 * This is the ONLY place that should call gtag directly for page views
 */

// Tracking IDs
export const GOOGLE_ADS_ID = 'AW-18000777475'
export const GA4_MEASUREMENT_ID = 'G-H8SYDHT9FB'

// High-value pages for custom event tracking
export const HIGH_VALUE_PAGES: Record<string, { projectName: string; eventName: string }> = {
  '/projects/chelsea-residences': { projectName: 'Chelsea Residences', eventName: 'view_project' },
  '/projects/damac-islands-2': { projectName: 'Damac Islands 2', eventName: 'view_project' },
  '/projects/damac-district': { projectName: 'Damac District', eventName: 'view_project' },
}

export type EventParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/**
 * Track a page view - call this ONCE per route change
 * Handles both GA4 and Google Ads page tracking
 */
export function trackPageView(url: string) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return

  // Google Ads page view
  window.gtag('config', GOOGLE_ADS_ID, {
    page_path: url,
  })

  // GA4 page view
  window.gtag('config', GA4_MEASUREMENT_ID, {
    page_path: url,
  })

  // Track high-value pages with custom events
  const pageConfig = HIGH_VALUE_PAGES[url]
  if (pageConfig) {
    trackEvent(pageConfig.eventName, {
      project_name: pageConfig.projectName,
      page_path: url,
    })
  }
}

/**
 * Track a custom event
 * Use this for meaningful user interactions (CTA clicks, form submissions, etc.)
 */
export function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return

  window.gtag('event', eventName, params || {})
}

/**
 * Track a Google Ads conversion
 * @param conversionLabel - The conversion label from Google Ads
 */
export function trackConversion(conversionLabel: string, params?: EventParams) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return

  window.gtag('event', 'conversion', {
    send_to: `${GOOGLE_ADS_ID}/${conversionLabel}`,
    ...params,
  })
}
