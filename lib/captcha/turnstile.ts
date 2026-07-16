import { NextRequest } from 'next/server'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstileToken(token: string, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET || ''
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return { success: true, message: 'Turnstile secret not configured in dev mode' }
    }
    return { success: false, message: 'Turnstile secret is not configured' }
  }

  const params = new URLSearchParams()
  params.set('secret', secret)
  params.set('response', token)
  if (remoteIp) params.set('remoteip', remoteIp)

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    return { success: false, message: `Turnstile verification failed with status ${res.status}` }
  }

  const payload = await res.json().catch(() => null)
  if (!payload || typeof payload.success !== 'boolean') {
    return { success: false, message: 'Turnstile verification returned invalid response' }
  }

  return {
    success: payload.success,
    message: payload.success ? 'Verified' : 'Turnstile verification failed',
    errors: Array.isArray(payload['error-codes']) ? payload['error-codes'] : undefined,
  }
}
