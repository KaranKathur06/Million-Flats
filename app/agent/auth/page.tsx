import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agent Access | MillionFlats',
  description: 'Choose to login or register as an agent on MillionFlats and start managing your real estate pipeline.',
}

function FeaturePill({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  )
}

export default async function AgentAuthPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (session?.user && (session.user as any)?.role === 'AGENT') {
    redirect('/agent/dashboard')
  }

  const params = await searchParams
  const tab = params?.tab === 'register' ? 'register' : 'login'

  return (
    <Suspense fallback={null}>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div className="flex flex-col justify-center">
              <span className="mb-4 inline-flex w-fit items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Agent Portal
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Launch your real estate network with confidence.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Access qualified leads, organize your pipeline, and grow your portfolio from a single secure destination.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <FeaturePill title="Qualified Leads" description="Receive trusted buyer and seller inquiries directly in your workspace." />
                <FeaturePill title="CRM Workflow" description="Track conversations, appointments, and portfolio activity in one place." />
                <FeaturePill title="Verified Profiles" description="Stand out with a verified MillionFlats profile and premium placement." />
                <FeaturePill title="Verix Tools" description="Use performance insights and productivity tools built for agent teams." />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 sm:p-8">
              <div className="flex rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
                <Link
                  href="/agent/auth?tab=login"
                  className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                    tab === 'login' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/agent/auth?tab=register"
                  className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                    tab === 'register' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Create Account
                </Link>
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  href="/agent/login"
                  className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-4 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/15"
                >
                  <div>
                    <p className="text-base font-semibold text-white">Log in to your account</p>
                    <p className="mt-1 text-sm text-slate-400">Continue managing listings and inquiries.</p>
                  </div>
                  <span className="text-xl text-cyan-300">→</span>
                </Link>

                <Link
                  href="/agent/register"
                  className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/70 px-5 py-4 text-left transition hover:border-slate-500 hover:bg-slate-800"
                >
                  <div>
                    <p className="text-base font-semibold text-white">Create a new agent account</p>
                    <p className="mt-1 text-sm text-slate-400">Start onboarding with secure profile verification.</p>
                  </div>
                  <span className="text-xl text-slate-300">→</span>
                </Link>
              </div>

              <p className="mt-6 text-sm text-slate-400">
                Need help? Reach our partner support team for onboarding, account verification, and portal access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  )
}
