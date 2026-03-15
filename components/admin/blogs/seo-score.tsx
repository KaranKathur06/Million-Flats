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
    if (score >= 80) return 'text-green-500'
    if (score >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <div className="w-5 h-5 bg-blue-500 rounded-full text-white text-xs font-bold">
              {score}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">SEO Score</p>
            <p className="text-xs text-gray-500">{getGrade(score)}</p>
          </div>
        </div>
        <div className="text-xl font-bold {getColor(score)}">
          {score}/100
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="text-sm text-gray-500">
          <p>80+ Excellent</p>
          <p>50+ Good</p>
          <p>0+ Needs Improvement</p>
        </div>
      </div>
    </div>
  )
}