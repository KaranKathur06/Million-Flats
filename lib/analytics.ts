type AnalyticsPayload = Record<string, unknown>

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

export function trackEvent(eventName: string, payload?: AnalyticsPayload) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return

  try {
    window.gtag('event', eventName, payload || {})
  } catch {
    // noop
  }
}
