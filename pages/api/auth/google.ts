import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
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
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ success: false, message: 'Google OAuth is not configured' })
  }

  const type = req.query.type === 'agent' ? 'agent' : 'user'

  const redirectToRaw = typeof req.query.redirectTo === 'string' ? req.query.redirectTo : ''
  const redirectTo = redirectToRaw.startsWith('/')
    ? redirectToRaw
    : '/auth/redirect'

  const baseUrl = getBaseUrl(req)
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  })

  const state = crypto.randomBytes(16).toString('hex')

  const meta = {
    type,
    redirectTo,
    createdAt: Date.now(),
  }

  const cookies = [
    serialize(COOKIE_STATE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    }),
    serialize(COOKIE_META, Buffer.from(JSON.stringify(meta)).toString('base64url'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    }),
  ]

  res.setHeader('Set-Cookie', cookies)

  const url = oauth2Client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  })

  res.redirect(url)
}
