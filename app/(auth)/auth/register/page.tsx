import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

export default function RegisterSelectPage() {
  return (
    <AuthLayout title="Create an Account" subtitle="Choose your access type">
      <div className="space-y-6">
        <Link
          href="/auth/user/register"
          className="group block rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-[#F5F8FF] p-6 transition-all hover:-translate-y-0.5 hover:border-dark-blue/30 hover:shadow-[0_18px_45px_rgba(10,25,60,0.12)]"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-dark-blue to-blue-600/70 transition-opacity group-hover:opacity-100 opacity-80" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-dark-blue">CREATE USER ACCOUNT</h3>
                  <p className="mt-1 text-sm text-gray-600">Save favorites, book tours, and invest with clarity.</p>
                </div>
                <div className="mt-1 text-dark-blue/70 group-hover:text-dark-blue transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-dark-blue">
                Continue
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/auth/agent/register"
          className="group block rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-[#F5F8FF] p-6 transition-all hover:-translate-y-0.5 hover:border-dark-blue/30 hover:shadow-[0_18px_45px_rgba(10,25,60,0.12)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-dark-blue to-blue-600/70 transition-opacity group-hover:opacity-100 opacity-80" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-dark-blue">CREATE AGENT ACCOUNT</h3>
                  <p className="mt-1 text-sm text-gray-600">Publish listings and manage qualified leads with Verix tools.</p>
                </div>
                <div className="mt-1 text-dark-blue/70 group-hover:text-dark-blue transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-dark-blue">
                Continue
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <p className="text-center text-sm text-gray-600 mt-8">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-dark-blue hover:opacity-90 transition-opacity">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
