import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function AgentOnboardingPage() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any

  if (!sessionUser?.email) {
    redirect('/agent/login')
  }

  const email = String(sessionUser.email).trim().toLowerCase()
  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })

  if (!dbUser) {
    redirect('/agent/login')
  }

  // Only agents should be here
  if (dbUser.role !== 'AGENT') {
    redirect(getHomeRouteForRole(dbUser.role))
  }

  const agent = dbUser.agent

  // If agent profile is fully live and approved, go to dashboard
  const profileStatus = agent ? String((agent as any).profileStatus || '') : ''
  if (agent && agent.approved && profileStatus === 'LIVE') {
    redirect('/agent/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div>
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Agent Onboarding</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">Complete your Agent Profile</h1>
            <p className="mt-3 text-gray-600">
              To access the Agent Portal, complete your professional verification. We review every profile before granting full access.
            </p>
          </div>

          <form action="/agent/onboarding/submit" method="post" className="mt-8 space-y-5">
            <div>
              <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-2">
                Real Estate License Number
              </label>
              <input
                id="license"
                name="license"
                type="text"
                required
                className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                placeholder="Enter your license number"
                defaultValue={dbUser.agent?.license || ''}
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                id="company"
                name="company"
                type="text"
                className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                placeholder="Enter your company name"
                defaultValue={dbUser.agent?.company || ''}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                placeholder="+971 XX XXX XXXX"
                defaultValue={dbUser.phone || ''}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-dark-blue/20"
              >
                Submit & Continue
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-dark-blue transition-colors">
                Continue as user
              </Link>
              <Link href="/contact" className="text-sm text-dark-blue hover:underline">
                Need help?
              </Link>
            </div>
          </form>

          <p className="mt-6 text-xs text-gray-500 leading-relaxed">
            By submitting, you request agent access. Approval may be required before listing or managing inventory.
          </p>
        </div>
      </div>
    </div>
  )
}
