import { trackEvent } from '@/lib/tracking'
import { POST_LOGIN_ACTION_KEY, type PostLoginAction } from './constants'

function safeJsonParse<T>(text: string | null): T | null {
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export function savePostLoginAction(action: PostLoginAction) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(POST_LOGIN_ACTION_KEY, JSON.stringify(action))
}

export function getPostLoginAction() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(POST_LOGIN_ACTION_KEY)
  return safeJsonParse<PostLoginAction>(raw)
}

export function clearPostLoginAction() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(POST_LOGIN_ACTION_KEY)
}

export async function trackLeadMagnetEvent(name: string, payload?: Record<string, unknown>) {
  trackEvent(name, payload as any)
  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, payload: payload || {}, path: typeof window !== 'undefined' ? window.location.pathname : null }),
      keepalive: true,
    })
  } catch {
    // Non-blocking analytics
  }
}
