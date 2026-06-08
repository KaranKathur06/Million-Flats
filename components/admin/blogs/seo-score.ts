import React from 'react'

interface SEOScoreProps {
  score: number
}

export const SEOScore: React.FC<SEOScoreProps> = ({ score }) => {
  const getGrade = (s: number) => {
    if (s >= 80) return 'Excellent'
    if (s >= 50) return 'Good'
    if (s >= 0) return 'Needs Improvement'
    return 'Poor'
  }

  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-500'
    if (s >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  return React.createElement(
    'div',
    { className: 'space-y-3' },
    React.createElement(
      'div',
      { className: 'flex items-center justify-between' },
      React.createElement(
        'div',
        { className: 'flex items-center' },
        React.createElement(
          'div',
          { className: 'w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center' },
          React.createElement(
            'div',
            { className: 'w-5 h-5 bg-blue-500 rounded-full text-white text-xs font-bold flex items-center justify-center' },
            String(score)
          )
        ),
        React.createElement(
          'div',
          { className: 'ml-3' },
          React.createElement('p', { className: 'text-sm font-medium text-gray-900' }, 'SEO Score'),
          React.createElement('p', { className: 'text-xs text-gray-500' }, getGrade(score))
        )
      ),
      React.createElement('div', { className: `text-xl font-bold ${getColor(score)}` }, `${score}/100`)
    ),
    React.createElement(
      'div',
      { className: 'border-t border-gray-200 pt-3' },
      React.createElement(
        'div',
        { className: 'text-sm text-gray-500' },
        React.createElement('p', null, '80+ Excellent'),
        React.createElement('p', null, '50+ Good'),
        React.createElement('p', null, '0+ Needs Improvement')
      )
    )
  )
}
