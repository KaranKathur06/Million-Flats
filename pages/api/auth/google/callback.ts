import type { NextApiRequest, NextApiResponse } from 'next'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { parse, serialize } from 'cookie'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ success: false, message: 'Google OAuth is not configured' })
  }

  const baseUrl = getBaseUrl(req)
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  const cookies = parse(req.headers.cookie || '')
  const expectedState = cookies[COOKIE_STATE]
  const meta = safeDecodeMeta(cookies[COOKIE_META])

  const state = typeof req.query.state === 'string' ? req.query.state : ''
  const code = typeof req.query.code === 'string' ? req.query.code : ''

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

  if (!expectedState || !state || expectedState !== state || !code) {
    res.setHeader('Set-Cookie', clearCookies)
    return res.redirect(`${baseUrl}${meta.type === 'agent' ? '/agent/login' : '/user/login'}?error=oauth_state`)
  }

  try {
    const oauth2Client = new OAuth2Client({
      clientId,
      clientSecret,
      redirectUri,
    })

    const tokenResponse = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokenResponse.tokens)

    const idToken = tokenResponse.tokens.id_token
    if (!idToken) {
      res.setHeader('Set-Cookie', clearCookies)
      return res.redirect(`${baseUrl}${meta.type === 'agent' ? '/agent/login' : '/user/login'}?error=missing_id_token`)
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: clientId,
    })

    const payload = ticket.getPayload()
    const email = payload?.email ? payload.email.trim().toLowerCase() : ''
    const googleId = payload?.sub || ''
    const name = payload?.name || payload?.given_name || null

    if (!email || !googleId) {
      res.setHeader('Set-Cookie', clearCookies)
      return res.redirect(`${baseUrl}${meta.type === 'agent' ? '/agent/login' : '/user/login'}?error=missing_profile`)
    }

    const existing = await prisma.user.findUnique({ where: { email }, include: { agent: true } })

    if (!existing) {
      res.setHeader('Set-Cookie', clearCookies)
      return res.redirect(`${baseUrl}${meta.type === 'agent' ? '/agent/login' : '/user/login'}?error=email_not_registered`)
    }

    if (meta.type === 'agent' && !existing.agent) {
      res.setHeader('Set-Cookie', clearCookies)
      return res.redirect(`${baseUrl}/agent/login?error=not_an_agent`)
    }

    if (existing.googleId && existing.googleId !== googleId) {
      res.setHeader('Set-Cookie', clearCookies)
      return res.redirect(`${baseUrl}${meta.type === 'agent' ? '/agent/login' : '/user/login'}?error=google_mismatch`)
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        googleId: existing.googleId || googleId,
        verified: true,
        name: existing.name || name,
      },
    })

    const userId: string = updated.id
    const userRole: string = updated.role

    const jwtToken = jwt.sign({ id: userId, email, role: userRole }, JWT_SECRET, { expiresIn: '7d' })

    res.setHeader('Set-Cookie', [
      ...clearCookies,
      serialize('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      }),
    ])

    return res.redirect(`${baseUrl}${meta.redirectTo}`)
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    res.setHeader('Set-Cookie', clearCookies)
    return res.redirect(`${baseUrl}${meta.type === 'agent' ? '/agent/login' : '/user/login'}?error=oauth_failed`)
  }
}
