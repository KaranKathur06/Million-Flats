import React from 'react'

interface SEOScoreProps {
  score: number
}

export const SEOScore: React.FC<SEOScoreProps> = ({ score }) => {
  const getGrade = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 50) return 'Good'
    if (score >= 0) return 'Needs Improvement'
    return 'Poor'
  }

  const getColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  const getBgColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20'
    if (score >= 50) return 'from-amber-500/20 to-amber-500/5 border-amber-500/20'
    return 'from-red-500/20 to-red-500/5 border-red-500/20'
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-400 to-emerald-500'
    if (score >= 50) return 'bg-gradient-to-r from-amber-400 to-amber-500'
    return 'bg-gradient-to-r from-red-400 to-red-500'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getBgColor(score)} border flex items-center justify-center`}>
            <svg className={`w-5 h-5 ${getColor(score)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">SEO Score</p>
            <p className={`text-xs font-medium ${getColor(score)}`}>{getGrade(score)}</p>
          </div>
        </div>
        <div className={`text-2xl font-extrabold tabular-nums ${getColor(score)}`}>
          {score}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>

      <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
          <span className="text-white/40">80+ Excellent</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-amber-400/80" />
          <span className="text-white/40">50+ Good</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-red-400/80" />
          <span className="text-white/40">0+ Needs Improvement</span>
        </div>
      </div>
    </div>
  )
}