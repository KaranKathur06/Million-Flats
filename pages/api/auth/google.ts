import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'

const COOKIE_STATE = 'google_oauth_state'
const COOKIE_META = 'google_oauth_meta'

function getBaseUrl(req: NextApiRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const proto = (req.headers['x-forwarded-proto'] as string | undefined) || 'http'
  const host = req.headers.host
  return `${proto}://${host}`
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    [
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
  )

  return res.status(410).json({ success: false, message: 'Legacy Google OAuth is disabled. Please use NextAuth.' })
}
