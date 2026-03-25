type AnalyticsPayload = Record<string, unknown>

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: unknown[]
  }
}

// Google Ads Conversion ID
export const GOOGLE_ADS_ID = 'AW-18000777475'

// High-value page configurations
export const HIGH_VALUE_PAGES: Record<string, { projectName: string; eventName: string }> = {
  '/': { projectName: 'Homepage', eventName: 'view_homepage' },
  '/projects/chelsea-residences': { projectName: 'Chelsea Residences', eventName: 'view_project' },
  '/projects/damac-islands-2': { projectName: 'Damac Islands 2', eventName: 'view_project' },
  '/projects/damac-district': { projectName: 'Damac District', eventName: 'view_project' },
}

/**
 * Track a custom event via gtag and internal analytics API
 */
export function trackEvent(eventName: string, payload?: AnalyticsPayload) {
  if (typeof window === 'undefined') return

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload || {})
    }

    const body = JSON.stringify({
      name: eventName,
      payload: payload || {},
      path: window.location?.pathname || '',
    })

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/analytics/event', new Blob([body], { type: 'application/json' }))
      return
    }

    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => null)
  } catch {
    // noop
  }
}

/**
 * Track a Google Ads conversion event
 * @param conversionLabel - The conversion label from Google Ads (e.g., 'abc123')
 * @param payload - Additional event parameters
 */
export function trackConversion(conversionLabel: string, payload?: AnalyticsPayload) {
  if (typeof window === 'undefined') return

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_ID}/${conversionLabel}`,
        ...payload,
      })
    }
  } catch {
    // noop
  }
}

/**
 * Track high-value page view with custom event
 * @param pathname - Current page pathname
 */
export function trackHighValuePage(pathname: string) {
  const pageConfig = HIGH_VALUE_PAGES[pathname]
  if (!pageConfig) return

  trackEvent(pageConfig.eventName, {
    project_name: pageConfig.projectName,
    page_path: pathname,
  })
}

/**
 * Track page view for Google Ads
 * @param pathname - Current page pathname
 */
export function trackPageView(pathname: string) {
  if (typeof window === 'undefined') return

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('config', GOOGLE_ADS_ID, {
        page_path: pathname,
      })
    }

    // Also track high-value pages
    trackHighValuePage(pathname)
  } catch {
    // noop
  }
}
