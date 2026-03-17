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

  if (dbUser.role !== 'AGENT') {
    redirect(getHomeRouteForRole(dbUser.role))
  }

  const agent = dbUser.agent
  const agentStatus = String((agent as any)?.status || 'REGISTERED').toUpperCase()

  // If already approved, go to dashboard
  if (agentStatus === 'APPROVED') {
    redirect('/agent/dashboard')
  }

  // If past onboarding stage, redirect accordingly
  if (agentStatus === 'PROFILE_INCOMPLETE' || agentStatus === 'PROFILE_COMPLETED') {
    redirect('/agent/profile?notice=complete_profile')
  }

  if (agentStatus === 'DOCUMENTS_UPLOADED' || agentStatus === 'UNDER_REVIEW') {
    redirect('/agent/verification')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Step Progress */}
        <div className="mb-8">
          <p className="text-center text-sm text-gray-500 mb-3">Agent Onboarding — Step 2 of 4</p>
          <div className="flex items-center gap-2">
            {['Email Verified', 'Basic Info', 'Full Profile', 'Documents'].map((step, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-full h-2 rounded-full ${i <= 1 ? 'bg-dark-blue' : 'bg-gray-200'}`} />
                <span className={`text-xs font-medium ${i <= 1 ? 'text-dark-blue' : 'text-gray-400'}`}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-10">
          <div className="mb-8">
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Getting Started</p>
            <h1 className="mt-2 text-3xl font-serif font-bold text-dark-blue">
              Tell Us About Yourself
            </h1>
            <p className="mt-3 text-gray-600">
              Provide your professional details to activate your agent account. All information is reviewed by our verification team.
            </p>
          </div>

          <form action="/agent/onboarding/submit" method="post" className="space-y-5">
            <div>
              <label htmlFor="license" className="block text-sm font-semibold text-gray-700 mb-2">
                Real Estate License Number <span className="text-red-500">*</span>
              </label>
              <input
                id="license"
                name="license"
                type="text"
                required
                className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all bg-white placeholder-gray-400"
                placeholder="e.g. DLD-12345 or RERA-67890"
                defaultValue={dbUser.agent?.license || ''}
              />
              <p className="mt-1.5 text-xs text-gray-500">Your official broker or agent license number from the relevant authority.</p>
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                Company / Agency Name <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="company"
                name="company"
                type="text"
                className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all bg-white placeholder-gray-400"
                placeholder="e.g. PropStar Realty"
                defaultValue={dbUser.agent?.company || ''}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all bg-white placeholder-gray-400"
                placeholder="+971 XX XXX XXXX"
                defaultValue={dbUser.phone || ''}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full h-12 bg-dark-blue text-white px-4 rounded-xl font-semibold hover:bg-dark-blue/90 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-dark-blue/20"
              >
                Continue to Profile →
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-dark-blue transition-colors">
                Continue as user instead
              </Link>
              <Link href="/contact" className="text-sm text-dark-blue hover:underline">
                Need help?
              </Link>
            </div>
          </form>
        </div>

        <p className="mt-6 text-xs text-center text-gray-500 leading-relaxed px-4">
          By submitting, you request agent access on MillionFlats. All profiles are reviewed before granting full access.
        </p>
      </div>
    </div>
  )
}
