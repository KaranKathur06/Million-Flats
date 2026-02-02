import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
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
  if (r === 'ADMIN' || r === 'AGENT' || r === 'USER') return r
  return 'USER'
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
      },
      async authorize(credentials: Record<string, unknown> | undefined) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''

        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.password) return null

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return null

        if (user.role === 'USER' && !user.verified) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        } as any
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
            emailVerified: new Date(),
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
        if (id) token.id = id
        token.role = role
      }

      const hasId = Boolean((token as any)?.id)
      const hasRole = Boolean((token as any)?.role)
      if ((!hasId || !hasRole) && (token as any)?.email) {
        const email = String((token as any).email).trim().toLowerCase()
        if (email) {
          const dbUser = await prisma.user.findUnique({ where: { email } }).catch(() => null)
          if (dbUser) {
            ;(token as any).id = (token as any).id || dbUser.id
            ;(token as any).role = normalizeRole((dbUser as any).role)

            if (!(dbUser as any).role) {
              await prisma.user.update({ where: { id: dbUser.id }, data: { role: 'USER' } as any }).catch(() => null)
            }
          } else {
            ;(token as any).role = normalizeRole((token as any).role)
          }
        }
      }

      ;(token as any).role = normalizeRole((token as any).role)
      return token
    },
    async session({ session, token }: any) {
      if (session?.user) {
        const tokenId = (token as any)?.id
        const tokenRole = (token as any)?.role
        if (tokenId) {
          ;(session.user as any).id = tokenId
        }
        ;(session.user as any).role = normalizeRole(tokenRole)
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
    signIn: '/user/login',
    error: '/auth/error',
  },
}
