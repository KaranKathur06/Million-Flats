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

// Next.js sets NEXT_PHASE=phase-production-build during `next build`. Env vars may be
// absent locally, so allow the build to complete and enforce secrets at runtime.
const isProdBuild = process.env.NEXT_PHASE === 'phase-production-build'

const authSecret =
  nextAuthSecret ||
  jwtSecret ||
  (isProdBuild
    ? '__next_build_placeholder__'
    : process.env.NODE_ENV !== 'production'
      ? 'development-secret-change-me'
      : undefined)

function normalizeRole(input: unknown) {
  const r = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (
    r === 'SUPERADMIN' ||
    r === 'ADMIN' ||
    r === 'VERIFIER' ||
    r === 'MODERATOR' ||
    r === 'AGENT' ||
    r === 'DEVELOPER' ||
    r === 'BUYER' ||
    r === 'USER'
  )
    return r
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

if (process.env.NODE_ENV === 'production' && !nextAuthSecret && !jwtSecret && !isProdBuild) {
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

        const intent =
          intentRaw === 'agent' || intentRaw === 'user' || intentRaw === 'developer' || intentRaw === 'admin'
            ? intentRaw
            : ''

        if (loginToken) {
          const expectedRole =
            intent === 'agent'
              ? 'AGENT'
              : intent === 'developer'
              ? 'DEVELOPER'
              : intent === 'admin'
              ? 'ADMIN'
              : 'USER'
          const tokenHash = crypto.createHash('sha256').update(loginToken).digest('hex')
          const now = new Date()

          let otpRow;
          try {
            otpRow = await (prisma as any).loginOtp
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
          } catch (error) {
            console.error('[auth] Database error querying loginOtp:', error)
            throw new Error('DATABASE_ERROR')
          }

          if (!otpRow) return null

          try {
            await (prisma as any).loginOtp.update({ where: { id: otpRow.id }, data: { usedAt: now } })
          } catch (error) {
            console.error('[auth] Database error updating loginOtp:', error)
          }

          let user
          try {
            user = await prisma.user.findUnique({ where: { email } })
          } catch (error) {
            console.error('[auth] Database error querying user:', error)
            throw new Error('DATABASE_ERROR')
          }
          if (!user) return null

          const status = String((user as any).status || 'ACTIVE')
          if (status === 'BANNED') throw new Error('ACCOUNT_BANNED')
          if (status === 'SUSPENDED') throw new Error('ACCOUNT_DISABLED')

          const isEmailVerified = Boolean((user as any).emailVerified) || Boolean((user as any).verified)
          if (!isEmailVerified) throw new Error('EMAIL_NOT_VERIFIED')

          if (intent === 'agent') {
            const role = String((user as any)?.role || '').toUpperCase()
            let agent
            try {
              agent = await (prisma as any).agent.findUnique({ where: { userId: user.id } })
            } catch (error) {
              console.error('[auth] Database error querying agent:', error)
              throw new Error('DATABASE_ERROR')
            }
            if (role !== 'AGENT' && !agent) throw new Error('AGENT_NOT_REGISTERED')
          }

          if (intent === 'developer') {
            const role = String((user as any)?.role || '').toUpperCase()
            if (role !== 'DEVELOPER') throw new Error('DEVELOPER_NOT_REGISTERED')
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            role: user.role,
            status: (user as any).status || 'ACTIVE',
          } as any
        }

        if (password) {
          if (intent === 'admin') {
            let user
            try {
              user = await prisma.user.findUnique({ where: { email } })
            } catch (error) {
              console.error('[auth] Database error querying user:', error)
              throw new Error('DATABASE_ERROR')
            }
            if (!user) return null

            const status = String((user as any).status || 'ACTIVE')
            if (status === 'BANNED') throw new Error('ACCOUNT_BANNED')
            if (status === 'SUSPENDED') throw new Error('ACCOUNT_DISABLED')

            const isEmailVerified = Boolean((user as any).emailVerified) || Boolean((user as any).verified)
            if (!isEmailVerified) throw new Error('EMAIL_NOT_VERIFIED')

            const passwordHash = typeof (user as any).password === 'string' ? String((user as any).password) : ''
            if (!passwordHash) throw new Error('PASSWORD_NOT_SET')

            const validPassword = await bcrypt.compare(password, passwordHash)
            if (!validPassword) throw new Error('INVALID_PASSWORD')

            const role = String((user as any)?.role || '').toUpperCase()
            if (!['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER'].includes(role)) throw new Error('ADMIN_ONLY')

            return {
              id: user.id,
              email: user.email,
              name: user.name ?? undefined,
              role: user.role,
              status: (user as any).status || 'ACTIVE',
            } as any
          }
          throw new Error('OTP_REQUIRED')
        }

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
          ; (user as any).id = updated.id
            ; (user as any).role = normalizeRole(updated.role)
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
          ; (token as any).agentProfileStatus = normalizeAgentProfileStatus((safeUser as any).agentProfileStatus)
        }

        if (typeof (safeUser as any).agentApproved === 'boolean') {
          ; (token as any).agentApproved = Boolean((safeUser as any).agentApproved)
        }

        if ((safeUser as any).agentVerificationStatus) {
          ; (token as any).agentVerificationStatus = normalizeAgentVerificationStatus((safeUser as any).agentVerificationStatus)
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
            normalizeStatus((token as any)?.status) === 'ACTIVE'

          const shouldRefreshAgentAuthz =
            normalizeRole((token as any)?.role) === 'AGENT' &&
            normalizeStatus((token as any)?.status) === 'ACTIVE' &&
            (typeof (token as any)?.agentApproved !== 'boolean' || !String((token as any)?.agentVerificationStatus || ''))

          if (shouldBackfillIdentity || shouldRefreshAgentStatus || shouldRefreshAgentAuthz) {
            const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true, developerProfile: true } }).catch(() => null)
            if (dbUser) {
              ; (token as any).id = (token as any).id || dbUser.id
                ; (token as any).role = normalizeRole((dbUser as any).role)
                ; (token as any).status = normalizeStatus((dbUser as any).status)
                ; (token as any).emailVerified = Boolean((dbUser as any).emailVerified) || Boolean((dbUser as any).verified)
                ; (token as any).agentProfileStatus = normalizeAgentProfileStatus((dbUser as any)?.agent?.profileStatus)
                ; (token as any).agentApproved = Boolean((dbUser as any)?.agent?.approved)
                ; (token as any).agentVerificationStatus = normalizeAgentVerificationStatus((dbUser as any)?.agent?.verificationStatus)
                // ✅ KEY FIX: Populate the new unified agentStatus from agent.status
                ; (token as any).agentStatus = String((dbUser as any)?.agent?.status || 'REGISTERED')
                ; (token as any).profileCompletion = Number((dbUser as any).profileCompletion || 0)
                ; (token as any).onboardingVersion = Number((dbUser as any).onboardingVersion || 0)

              // ── Developer token enrichment ────────────────────────────────
              if (normalizeRole((dbUser as any).role) === 'DEVELOPER' && (dbUser as any).developerProfile) {
                const dp = (dbUser as any).developerProfile
                ; (token as any).developerProfileId = dp.id
                ; (token as any).developerOnboardingStatus = String(dp.onboardingStatus || 'REGISTERED')
                ; (token as any).developerKycStatus = String(dp.kycStatus || 'PENDING')
                ; (token as any).developerProfileCompletion = Number(dp.profileCompletion || 0)
                ; (token as any).developerIsVerified = Boolean(dp.isVerified)
              }

              if (!(dbUser as any).role) {
                await prisma.user.update({ where: { id: dbUser.id }, data: { role: 'USER' } as any }).catch(() => null)
              }
            } else {
              ; (token as any).role = normalizeRole((token as any).role)
                ; (token as any).status = normalizeStatus((token as any).status)
            }
          }
        }
      }

      ; (token as any).role = normalizeRole((token as any).role)
        ; (token as any).status = normalizeStatus((token as any).status)
      if ((token as any).agentProfileStatus) {
        ; (token as any).agentProfileStatus = normalizeAgentProfileStatus((token as any).agentProfileStatus)
      }
      if ((token as any).agentVerificationStatus) {
        ; (token as any).agentVerificationStatus = normalizeAgentVerificationStatus((token as any).agentVerificationStatus)
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
          ; (session.user as any).id = tokenId
        }
        ; (session.user as any).role = normalizeRole(tokenRole)
          ; (session.user as any).status = normalizeStatus(tokenStatus)
        if (typeof tokenEmailVerified === 'boolean') {
          ; (session.user as any).emailVerified = tokenEmailVerified
        }
        if (tokenAgentProfileStatus) {
          ; (session.user as any).agentProfileStatus = normalizeAgentProfileStatus(tokenAgentProfileStatus)
        }
        if (typeof tokenAgentApproved === 'boolean') {
          ; (session.user as any).agentApproved = tokenAgentApproved
        }
        if (tokenAgentVerificationStatus) {
          ; (session.user as any).agentVerificationStatus = normalizeAgentVerificationStatus(tokenAgentVerificationStatus)
        }
        if (typeof (token as any).profileCompletion === 'number') {
          ; (session.user as any).profileCompletion = (token as any).profileCompletion
        }
        if (typeof (token as any).onboardingVersion === 'number') {
          ; (session.user as any).onboardingVersion = (token as any).onboardingVersion
        }
        // ── Developer session fields ─────────────────────────────────────────
        if ((token as any)?.developerProfileId) {
          ; (session.user as any).developerProfileId = (token as any).developerProfileId
          ; (session.user as any).developerOnboardingStatus = (token as any).developerOnboardingStatus || 'REGISTERED'
          ; (session.user as any).developerKycStatus = (token as any).developerKycStatus || 'PENDING'
          ; (session.user as any).developerProfileCompletion = (token as any).developerProfileCompletion || 0
          ; (session.user as any).developerIsVerified = Boolean((token as any).developerIsVerified)
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
        `${baseUrl}/admin/login`,
        `${baseUrl}/admin`,
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
