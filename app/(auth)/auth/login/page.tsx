import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AuthLayout from '@/components/AuthLayout'

export default async function AuthLoginPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const role = String((session.user as any)?.role || '').toUpperCase()
    redirect(getHomeRouteForRole(role))
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Choose your access type">
      <div className="space-y-4">
        <Link
          href="/auth/user/login"
          className="group block rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-[#F5F8FF] p-5 transition-all hover:border-dark-blue/30 hover:shadow-[0_18px_45px_rgba(10,25,60,0.12)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-dark-blue to-blue-600/70 transition-opacity group-hover:opacity-100 opacity-80" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold tracking-wide text-dark-blue">USER ACCESS</h3>
                  <p className="mt-2 text-sm text-gray-600">Browse and invest in premium properties worldwide.</p>
                </div>
                <div className="mt-0.5 text-dark-blue/70 group-hover:text-dark-blue transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/auth/agent/login"
          className="group block rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-[#F5F8FF] p-5 transition-all hover:border-dark-blue/30 hover:shadow-[0_18px_45px_rgba(10,25,60,0.12)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-dark-blue to-blue-600/70 transition-opacity group-hover:opacity-100 opacity-80" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold tracking-wide text-dark-blue">AGENT ACCESS</h3>
                  <p className="mt-2 text-sm text-gray-600">List properties and manage qualified leads with Verix tools.</p>
                </div>
                <div className="mt-0.5 text-dark-blue/70 group-hover:text-dark-blue transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <p className="text-center text-sm text-gray-600 mt-8">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="font-semibold text-dark-blue hover:opacity-90 transition-opacity">
          Register
        </Link>
      </p>
    </AuthLayout>
  )
}
