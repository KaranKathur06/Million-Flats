import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

function getEnv(name: string) {
  const v = process.env[name]
  return v && v.length > 0 ? v : undefined
}

const nextAuthSecret = getEnv('NEXTAUTH_SECRET')
const googleClientId = getEnv('GOOGLE_CLIENT_ID')
const googleClientSecret = getEnv('GOOGLE_CLIENT_SECRET')
const jwtSecret = getEnv('JWT_SECRET')
const authSecret = nextAuthSecret || jwtSecret

function normalizeRole(input: unknown) {
  const r = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (r === 'SUPERADMIN' || r === 'ADMIN' || r === 'AGENT' || r === 'USER') return r
  return 'USER'
}

function normalizeStatus(input: unknown) {
  const s = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (s === 'ACTIVE' || s === 'SUSPENDED' || s === 'BANNED') return s
  return 'ACTIVE'
}

function normalizeAgentProfileStatus(input: unknown) {
  const s = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (s === 'DRAFT' || s === 'SUBMITTED' || s === 'VERIFIED' || s === 'LIVE' || s === 'SUSPENDED') return s
  return ''
}

function normalizeAgentVerificationStatus(input: unknown) {
  const s = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (s === 'PENDING' || s === 'APPROVED' || s === 'REJECTED') return s
  return ''
}

let didAttemptRoleBackfill = false

async function backfillNullRoles() {
  if (didAttemptRoleBackfill) return
  didAttemptRoleBackfill = true
  try {
    await (prisma as any).$executeRaw`UPDATE "users" SET "role"='USER' WHERE "role" IS NULL`
  } catch {
    // ignore
  }
}

if (process.env.NODE_ENV === 'production' && !authSecret) {
  throw new Error('Missing NEXTAUTH_SECRET (or JWT_SECRET) in production')
}

export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(prisma),
    async createUser(data: any) {
      const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : ''
      if (!email) {
        return prisma.user.create({ data }) as any
      }

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return existing as any

      return prisma.user.create({ data: { ...data, email } }) as any
    },
    async getUserByEmail(email: string) {
      const normalized = (email || '').trim().toLowerCase()
      if (!normalized) return null
      return (await prisma.user.findUnique({ where: { email: normalized } })) as any
    },
  } as any,
  secret: authSecret,
  session: {
    strategy: 'jwt',
  },
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        loginToken: { label: 'Login Token', type: 'text' },
        intent: { label: 'Intent', type: 'text' },
      },
      async authorize(credentials: Record<string, unknown> | undefined) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''
        const loginToken = typeof credentials?.loginToken === 'string' ? credentials.loginToken.trim() : ''
        const intentRaw = typeof credentials?.intent === 'string' ? credentials.intent.trim().toLowerCase() : ''

        if (!email) return null

        const intent = intentRaw === 'agent' || intentRaw === 'user' ? intentRaw : ''

        if (loginToken) {
          const expectedRole = intent === 'agent' ? 'AGENT' : 'USER'
          const tokenHash = crypto.createHash('sha256').update(loginToken).digest('hex')
          const now = new Date()

          const otpRow = await (prisma as any).loginOtp
            .findFirst({
              where: {
                email,
                role: expectedRole,
                consumed: true,
                usedAt: null,
                loginTokenHash: tokenHash,
                loginTokenExpiresAt: { gt: now },
              },
              orderBy: { createdAt: 'desc' },
            })
            .catch(() => null)

          if (!otpRow) return null

          await (prisma as any).loginOtp.update({ where: { id: otpRow.id }, data: { usedAt: now } }).catch(() => null)

          const user = await prisma.user.findUnique({ where: { email } }).catch(() => null)
          if (!user) return null

          const status = String((user as any).status || 'ACTIVE')
          if (status === 'BANNED') throw new Error('ACCOUNT_BANNED')
          if (status === 'SUSPENDED') throw new Error('ACCOUNT_DISABLED')

          const isEmailVerified = Boolean((user as any).emailVerified) || Boolean((user as any).verified)
          if (!isEmailVerified) throw new Error('EMAIL_NOT_VERIFIED')

          if (intent === 'agent') {
            const role = String((user as any)?.role || '').toUpperCase()
            const agent = await (prisma as any).agent.findUnique({ where: { userId: user.id } }).catch(() => null)
            if (role !== 'AGENT' && !agent) throw new Error('AGENT_NOT_REGISTERED')
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            role: user.role,
            status: (user as any).status || 'ACTIVE',
          } as any
        }

        if (password) throw new Error('OTP_REQUIRED')
        return null
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      try {
        if (account?.provider !== 'google') return true

        const email = (profile as any)?.email ? String((profile as any).email).trim().toLowerCase() : ''
        const googleId = (profile as any)?.sub ? String((profile as any).sub) : ''

        if (!email || !googleId) return false

        await backfillNullRoles()

        const existing = await prisma.user.findUnique({ where: { email } })
        if (!existing) {
          return '/user/login?error=email_not_registered'
        }

        if (existing.googleId && existing.googleId !== googleId) return false

        const updated = await prisma.user.update({
          where: { email },
          data: {
            googleId: existing.googleId || googleId,
            verified: true,
            name: existing.name || (user?.name ?? null),
            emailVerified: true,
            emailVerifiedAt: new Date(),
            role: (existing as any).role || 'USER',
          } as any,
        })

        if (user && typeof user === 'object') {
          ;(user as any).id = updated.id
          ;(user as any).role = normalizeRole(updated.role)
        }
        return true
      } catch {
        return '/auth/error'
      }
    },
    async jwt({ token, user }: any) {
      await backfillNullRoles()

      const safeUser = user && typeof user === 'object' ? user : null
      if (safeUser) {
        const id = (safeUser as any).id
        const role = normalizeRole((safeUser as any).role)
        const status = normalizeStatus((safeUser as any).status)
        if (id) token.id = id
        token.role = role
        token.status = status
        if ((safeUser as any).agentProfileStatus) {
          ;(token as any).agentProfileStatus = normalizeAgentProfileStatus((safeUser as any).agentProfileStatus)
        }

        if (typeof (safeUser as any).agentApproved === 'boolean') {
          ;(token as any).agentApproved = Boolean((safeUser as any).agentApproved)
        }

        if ((safeUser as any).agentVerificationStatus) {
          ;(token as any).agentVerificationStatus = normalizeAgentVerificationStatus((safeUser as any).agentVerificationStatus)
        }
      }

      const hasId = Boolean((token as any)?.id)
      const hasRole = Boolean((token as any)?.role)
      const tokenEmailRaw = (token as any)?.email
      if (tokenEmailRaw) {
        const email = String(tokenEmailRaw).trim().toLowerCase()
        if (email) {
          const shouldBackfillIdentity = !hasId || !hasRole
          const shouldRefreshAgentStatus =
            normalizeRole((token as any)?.role) === 'AGENT' &&
            normalizeStatus((token as any)?.status) === 'ACTIVE' &&
            normalizeAgentProfileStatus((token as any)?.agentProfileStatus) !== 'LIVE'

          const shouldRefreshAgentAuthz =
            normalizeRole((token as any)?.role) === 'AGENT' &&
            normalizeStatus((token as any)?.status) === 'ACTIVE' &&
            (typeof (token as any)?.agentApproved !== 'boolean' || !String((token as any)?.agentVerificationStatus || ''))

          if (shouldBackfillIdentity || shouldRefreshAgentStatus || shouldRefreshAgentAuthz) {
            const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } }).catch(() => null)
            if (dbUser) {
              ;(token as any).id = (token as any).id || dbUser.id
              ;(token as any).role = normalizeRole((dbUser as any).role)
              ;(token as any).status = normalizeStatus((dbUser as any).status)
              ;(token as any).emailVerified = Boolean((dbUser as any).emailVerified) || Boolean((dbUser as any).verified)
              ;(token as any).agentProfileStatus = normalizeAgentProfileStatus((dbUser as any)?.agent?.profileStatus)
              ;(token as any).agentApproved = Boolean((dbUser as any)?.agent?.approved)
              ;(token as any).agentVerificationStatus = normalizeAgentVerificationStatus((dbUser as any)?.agent?.verificationStatus)

              if (!(dbUser as any).role) {
                await prisma.user.update({ where: { id: dbUser.id }, data: { role: 'USER' } as any }).catch(() => null)
              }
            } else {
              ;(token as any).role = normalizeRole((token as any).role)
              ;(token as any).status = normalizeStatus((token as any).status)
            }
          }
        }
      }

      ;(token as any).role = normalizeRole((token as any).role)
      ;(token as any).status = normalizeStatus((token as any).status)
      if ((token as any).agentProfileStatus) {
        ;(token as any).agentProfileStatus = normalizeAgentProfileStatus((token as any).agentProfileStatus)
      }
      if ((token as any).agentVerificationStatus) {
        ;(token as any).agentVerificationStatus = normalizeAgentVerificationStatus((token as any).agentVerificationStatus)
      }
      return token
    },
    async session({ session, token }: any) {
      if (session?.user) {
        const tokenId = (token as any)?.id
        const tokenRole = (token as any)?.role
        const tokenStatus = (token as any)?.status
        const tokenEmailVerified = (token as any)?.emailVerified
        const tokenAgentProfileStatus = (token as any)?.agentProfileStatus
        const tokenAgentApproved = (token as any)?.agentApproved
        const tokenAgentVerificationStatus = (token as any)?.agentVerificationStatus
        if (tokenId) {
          ;(session.user as any).id = tokenId
        }
        ;(session.user as any).role = normalizeRole(tokenRole)
        ;(session.user as any).status = normalizeStatus(tokenStatus)
        if (typeof tokenEmailVerified === 'boolean') {
          ;(session.user as any).emailVerified = tokenEmailVerified
        }
        if (tokenAgentProfileStatus) {
          ;(session.user as any).agentProfileStatus = normalizeAgentProfileStatus(tokenAgentProfileStatus)
        }
        if (typeof tokenAgentApproved === 'boolean') {
          ;(session.user as any).agentApproved = tokenAgentApproved
        }
        if (tokenAgentVerificationStatus) {
          ;(session.user as any).agentVerificationStatus = normalizeAgentVerificationStatus(tokenAgentVerificationStatus)
        }
      }
      return session
    },
    async redirect({ url, baseUrl }: any) {
      if (typeof url !== 'string') return baseUrl

      const resolvedUrl = url.startsWith('/') ? `${baseUrl}${url}` : url
      if (!resolvedUrl.startsWith(baseUrl)) return baseUrl

      if (resolvedUrl === baseUrl || resolvedUrl === `${baseUrl}/`) return resolvedUrl
      if (resolvedUrl.startsWith(`${baseUrl}/api/auth`)) return resolvedUrl
      if (resolvedUrl.startsWith(`${baseUrl}/auth/redirect`)) return resolvedUrl

      const allowedPrefixes = [
        `${baseUrl}/auth/error`,
        `${baseUrl}/auth/login`,
        `${baseUrl}/auth/register`,
        `${baseUrl}/user/login`,
        `${baseUrl}/user/register`,
        `${baseUrl}/user/verify`,
        `${baseUrl}/agent/login`,
        `${baseUrl}/agent/register`,
      ]
      if (allowedPrefixes.some((p) => resolvedUrl.startsWith(p))) return resolvedUrl

      return `${baseUrl}/auth/redirect`
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
}
