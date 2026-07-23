import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeAndSaveAiDeveloperScore } from '@/lib/verix/verixDeveloper'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI™ Developer Score | MillionFlats',
}

const SCORE_COLORS = {
  S: { ring: 'stroke-amber-400', bg: 'from-amber-50 to-yellow-50', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
  A: { ring: 'stroke-emerald-500', bg: 'from-emerald-50 to-green-50', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  B: { ring: 'stroke-blue-500', bg: 'from-blue-50 to-indigo-50', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  C: { ring: 'stroke-purple-500', bg: 'from-purple-50 to-violet-50', badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
  D: { ring: 'stroke-gray-400', bg: 'from-gray-50 to-slate-50', badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
  F: { ring: 'stroke-red-400', bg: 'from-red-50 to-rose-50', badge: 'bg-red-100 text-red-600', border: 'border-red-200' },
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const colors = SCORE_COLORS[grade as keyof typeof SCORE_COLORS] || SCORE_COLORS.D
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-40 h-40 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" className={colors.ring} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-gray-900">{score}</span>
        <span className="text-xs text-gray-400 font-medium -mt-1">/ 100</span>
      </div>
    </div>
  )
}

function DimensionBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500">{value}/{max}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function DeveloperAIPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/developer/auth?tab=login')

  const userId = (session.user as any)?.id
  const profile = await (prisma as any).developerProfile.findUnique({
    where: { userId },
    select: { id: true, onboardingStatus: true, aiDeveloperScore: true },
  })
  if (!profile) redirect('/developer/onboarding')

  // Compute fresh score (don't persist on every page load — just compute for display)
  let breakdown
  try {
    breakdown = await computeAndSaveAiDeveloperScore(profile.id, false)
  } catch {
    breakdown = { total: 0, profileQuality: 0, legalVerification: 0, trackRecord: 0, marketActivity: 0, trustSignals: 0, grade: 'F' as const, label: 'Unrated' }
  }

  const { total, profileQuality, legalVerification, trackRecord, marketActivity, trustSignals, grade, label } = breakdown
  const colors = SCORE_COLORS[grade] || SCORE_COLORS.D

  const improvements = [
    !profileQuality || profileQuality < 20 ? { label: 'Complete your profile', href: '/developer/onboarding', pts: '~5–10 pts' } : null,
    !legalVerification || legalVerification < 25 ? { label: 'Add RERA & legal details', href: '/developer/profile', pts: '~12–15 pts' } : null,
    !trustSignals || trustSignals < 5 ? { label: 'Get verified by admin', href: '/developer/verification', pts: '~5 pts' } : null,
    !marketActivity || marketActivity < 10 ? { label: 'Publish projects to earn views', href: '/developer/projects', pts: '~5–10 pts' } : null,
  ].filter(Boolean)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">AI™ Developer Score</h1>
      <p className="text-gray-500 text-sm mb-8">Your trust and quality score — used to rank your profile and build buyer confidence.</p>

      <div className={`rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border} p-8 mb-6 text-center`}>
        <ScoreRing score={total} grade={grade} />
        <div className="mt-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${colors.badge}`}>
            Grade {grade} — {label}
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-3 max-w-md mx-auto">
          {grade === 'S' && 'Outstanding! You are among the top-tier verified developers on MillionFlats.'}
          {grade === 'A' && 'Excellent profile. Buyers strongly trust your listings.'}
          {grade === 'B' && 'Good standing. A few improvements can push you to Gold.'}
          {grade === 'C' && 'Your profile is verified but has room to grow.'}
          {grade === 'D' && 'Profile needs more details and verification.'}
          {grade === 'F' && 'Start by completing your profile and uploading documents.'}
        </p>
      </div>

      {/* Score breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-5">Score Breakdown</h2>
        <div className="space-y-5">
          <DimensionBar label="Profile Quality" value={profileQuality} max={25} color="bg-blue-500" />
          <DimensionBar label="Legal Verification" value={legalVerification} max={30} color="bg-emerald-500" />
          <DimensionBar label="Track Record" value={trackRecord} max={20} color="bg-purple-500" />
          <DimensionBar label="Market Activity" value={marketActivity} max={15} color="bg-amber-500" />
          <DimensionBar label="Trust Signals" value={trustSignals} max={10} color="bg-pink-500" />
        </div>
      </div>

      {/* Improvement tips */}
      {improvements.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">How to Improve Your Score</h2>
          <div className="space-y-3">
            {improvements.map((tip: any) => (
              <a key={tip.label} href={tip.href}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-dark-blue/20 hover:bg-blue-50/50 transition-all group">
                <span className="text-sm text-gray-700 group-hover:text-dark-blue font-medium">{tip.label}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">{tip.pts}</span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
