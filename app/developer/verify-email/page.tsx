import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Verify Your Email | MillionFlats Developer Portal',
  description: 'Verify your email address to continue setting up your developer account.',
}

export default async function DeveloperVerifyEmailPage() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ? String(session.user.email).toLowerCase() : ''

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { developerProfile: true },
    })

    const verified = Boolean((user as any)?.emailVerified) || Boolean((user as any)?.verified)
    if (verified) {
      const status = String((user as any)?.developerProfile?.onboardingStatus || '').toUpperCase()
      redirect(status === 'APPROVED' ? '/developer/dashboard' : '/developer/onboarding')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-blue-50">
          <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-950">Verify your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter the verification code sent during registration. Once verified, your session refreshes automatically and this page will not appear again.
        </p>

        <Link
          href={email ? `/developer/verify-otp?email=${encodeURIComponent(email)}` : '/developer/verify-otp'}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Enter Verification Code
        </Link>

        <p className="mt-4 text-xs text-slate-400">
          Wrong email?{' '}
          <Link href="/developer/register" className="font-medium text-slate-700 hover:underline">
            Register again
          </Link>
        </p>
      </div>
    </div>
  )
}
