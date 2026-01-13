import NextAuth, { type NextAuthOptions } from 'next-auth'
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

const authOptions: NextAuthOptions = {
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
  secret: nextAuthSecret,
  session: {
    strategy: 'jwt',
  },
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            // Identity linking is enforced in callbacks.signIn (email-first)
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

        // Enforce verification for password flow
        if (!user.verified) return null

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
      // Email-first identity linking for Google
      if (account?.provider !== 'google') return true

      const email = (profile as any)?.email ? String((profile as any).email).trim().toLowerCase() : ''
      const googleId = (profile as any)?.sub ? String((profile as any).sub) : ''

      if (!email || !googleId) return false

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        // If googleId exists but differs, refuse to link (prevents takeover)
        if (existing.googleId && existing.googleId !== googleId) return false

        await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: existing.googleId || googleId,
            verified: true,
            name: existing.name || (user?.name ?? null),
            emailVerified: new Date(),
          } as any,
        })

        ;(user as any).id = existing.id
        ;(user as any).role = existing.role
        return true
      }

      const createdId = (user as any)?.id
      if (createdId) {
        const updated = await prisma.user.update({
          where: { id: createdId },
          data: {
            googleId,
            verified: true,
            emailVerified: new Date(),
            name: user?.name ?? null,
          } as any,
        })
        ;(user as any).role = updated.role
      }
      return true
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).role = (token as any).role
      }
      return session
    },
  },
  pages: {
    signIn: '/user/login',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
