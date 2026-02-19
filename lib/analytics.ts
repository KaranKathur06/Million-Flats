type AnalyticsPayload = Record<string, unknown>

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

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
