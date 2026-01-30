import type { NextApiRequest, NextApiResponse } from 'next'
import { parse, serialize } from 'cookie'

const COOKIE_STATE = 'google_oauth_state'
const COOKIE_META = 'google_oauth_meta'

function getBaseUrl(req: NextApiRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const proto = (req.headers['x-forwarded-proto'] as string | undefined) || 'http'
  const host = req.headers.host
  return `${proto}://${host}`
}

function safeDecodeMeta(metaCookie: string | undefined): { type: 'user' | 'agent'; redirectTo: string } {
  if (!metaCookie) return { type: 'user', redirectTo: '/auth/redirect' }
  try {
    const raw = Buffer.from(metaCookie, 'base64url').toString('utf8')
    const parsed = JSON.parse(raw) as { type?: unknown; redirectTo?: unknown }
    const type = parsed.type === 'agent' ? 'agent' : 'user'
    const redirectTo = typeof parsed.redirectTo === 'string' && parsed.redirectTo.startsWith('/')
      ? parsed.redirectTo
      : '/auth/redirect'

    return { type, redirectTo }
  } catch {
    return { type: 'user', redirectTo: '/auth/redirect' }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = getBaseUrl(req)
  const cookies = parse(req.headers.cookie || '')
  const meta = safeDecodeMeta(cookies[COOKIE_META])

  const clearCookies = [
    serialize(COOKIE_STATE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    }),
    serialize(COOKIE_META, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    }),
  ]

  res.setHeader('Set-Cookie', clearCookies)
  return res.redirect(`${baseUrl}${meta.type === 'agent' ? '/agent/login' : '/user/login'}?error=oauth_disabled`)
}
