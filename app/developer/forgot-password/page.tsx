import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Forgot Password | Developer Portal | MillionFlats',
  description: 'Reset your MillionFlats Developer Portal access via WhatsApp OTP.',
}

export default function DeveloperForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="relative w-10 h-10 shrink-0">
            <Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain rounded-xl" sizes="40px" />
          </span>
          <span className="text-dark-blue font-semibold text-xl">MillionFlats</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-black/5 p-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-full px-3 py-1 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Developer Portal
          </div>

          <h1 className="text-2xl font-bold text-dark-blue mb-2">Recover Access</h1>
          <p className="text-sm text-gray-500 mb-8">
            Developer accounts use WhatsApp OTP authentication. Simply log in again using your registered WhatsApp number — no password needed.
          </p>

          {/* Info card */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mb-6">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-1">Passwordless Authentication</p>
                <p className="leading-relaxed text-blue-600">
                  MillionFlats uses secure WhatsApp OTP login. No password is ever set. Enter your registered WhatsApp number on the login page to receive a one-time code.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/developer/auth?tab=login"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-dark-blue text-white font-semibold text-sm hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20"
          >
            Go to Developer Login →
          </Link>

          <p className="mt-4 text-center text-xs text-gray-400">
            Need help?{' '}
            <Link href="/contact" className="text-dark-blue hover:underline font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
