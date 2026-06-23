import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Verify Your Email | MillionFlats Developer Portal',
  description: 'Please verify your email address to continue setting up your developer account.',
}

export default function DeveloperVerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          We&apos;ve sent a verification link to your email address. Please check your inbox (and spam folder) and click the link to activate your developer account.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 text-left mb-6">
          <p className="font-semibold mb-1">After verifying your email:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            <li>Complete your 5-step company profile</li>
            <li>Upload your legal documents</li>
            <li>Get verified by our team</li>
            <li>Start publishing projects &amp; receiving leads</li>
          </ul>
        </div>

        <form action="/api/developer/resend-verification" method="POST">
          <button
            type="submit"
            className="w-full h-11 bg-dark-blue text-white rounded-xl text-sm font-semibold hover:bg-dark-blue/90 transition-all"
          >
            Resend Verification Email
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400">
          Wrong email?{' '}
          <Link href="/developer/register" className="text-dark-blue hover:underline">
            Register again
          </Link>
        </p>
      </div>
    </div>
  )
}
