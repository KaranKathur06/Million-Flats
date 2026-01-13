import NextAuth, { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

function requireEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

export const authOptions: NextAuthOptions = {
  secret: requireEnv('NEXTAUTH_SECRET'),
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: requireEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
      // Identity linking is enforced in callbacks.signIn (email-first)
      allowDangerousEmailAccountLinking: true,
    }),
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
          },
        })

        ;(user as any).id = existing.id
        ;(user as any).role = existing.role
        return true
      }

      const created = await prisma.user.create({
        data: {
          email,
          googleId,
          verified: true,
          name: user?.name ?? null,
          role: 'USER',
        },
      })

      ;(user as any).id = created.id
      ;(user as any).role = created.role
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
