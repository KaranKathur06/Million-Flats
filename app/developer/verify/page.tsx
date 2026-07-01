import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Verification Status | Developer Portal | MillionFlats',
  description: 'Check your developer verification and approval status on MillionFlats.',
}

export default async function DeveloperVerifyPage() {
  const session = await getServerSession(authOptions)

  // Not logged in → redirect to login
  if (!session?.user) {
    redirect('/developer/auth?tab=login')
  }

  const role = String((session.user as any)?.role || '').toUpperCase()
  // Already fully approved → go to dashboard
  if (role === 'DEVELOPER') {
    redirect('/developer/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="relative w-10 h-10 shrink-0">
            <Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain rounded-xl" sizes="40px" />
          </span>
          <span className="text-dark-blue font-semibold text-xl">MillionFlats</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-black/5 p-8 text-center">
          {/* Status Icon */}
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-full px-3 py-1 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Under Review
          </div>

          <h1 className="text-2xl font-bold text-dark-blue mb-2">Developer Verification Pending</h1>
          <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
            Your developer profile has been submitted for review. Our team will verify your credentials and RERA registration within 1–3 business days.
          </p>

          {/* Progress Steps */}
          <div className="space-y-3 mb-8 text-left">
            {[
              { step: 'Account Created', done: true, desc: 'Your developer account has been registered' },
              { step: 'Profile Submitted', done: true, desc: 'Company details and documents received' },
              { step: 'Under Review', done: false, active: true, desc: 'Our team is verifying your RERA and company documents' },
              { step: 'Verified', done: false, desc: 'Developer profile and projects go live' },
              { step: 'Featured', done: false, desc: 'Eligible for featured placement on the marketplace' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  item.done
                    ? 'bg-green-500'
                    : item.active
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                }`}>
                  {item.done ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : item.active ? (
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  ) : (
                    <span className="w-2 h-2 bg-gray-400 rounded-full" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${item.done || item.active ? 'text-dark-blue' : 'text-gray-400'}`}>
                    {item.step}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 px-6 text-sm font-semibold hover:border-dark-blue hover:text-dark-blue transition-all"
            >
              Contact Support
            </Link>
            <Link
              href="/developers"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue text-white px-6 text-sm font-semibold hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20"
            >
              Browse Developers
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
