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
            allowDangerousEmailAccountLinking: true,
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
      if (account?.provider !== 'google') return true

      const email = (profile as any)?.email ? String((profile as any).email).trim().toLowerCase() : ''
      const googleId = (profile as any)?.sub ? String((profile as any).sub) : ''

      if (!email || !googleId) return false

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing?.googleId && existing.googleId !== googleId) return false

      const updated = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: user?.name ?? null,
          googleId,
          verified: true,
          emailVerified: new Date(),
        } as any,
        update: {
          googleId: existing?.googleId || googleId,
          verified: true,
          name: existing?.name || (user?.name ?? null),
          emailVerified: new Date(),
        } as any,
      })

      ;(user as any).id = updated.id
      ;(user as any).role = updated.role
      return true
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      }

      if ((!token.role || !token.id) && token.email) {
        const email = String(token.email).trim().toLowerCase()
        if (email) {
          const dbUser = await prisma.user.findUnique({ where: { email } }).catch(() => null)
          if (dbUser) {
            token.id = token.id || dbUser.id
            token.role = token.role || dbUser.role
          }
        }
      }

      if (!token.role) token.role = 'USER'
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).role = (token as any).role
      }
      return session
    },
    async redirect({ url, baseUrl }: any) {
      if (typeof url !== 'string') return baseUrl
      if (!url.startsWith(baseUrl)) return baseUrl

      if (url === baseUrl || url === `${baseUrl}/`) return url
      if (url.startsWith(`${baseUrl}/api/auth`)) return url
      if (url.startsWith(`${baseUrl}/auth/redirect`)) return url

      return `${baseUrl}/auth/redirect`
    },
  },
  pages: {
    signIn: '/user/login',
    error: '/auth/error',
  },
}
