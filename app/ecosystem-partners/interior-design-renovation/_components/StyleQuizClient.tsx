'use client'

import { useMemo, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

const QUESTIONS = [
  {
    q: 'Which look feels most like your home?',
    options: ['Modern', 'Traditional', 'Scandinavian', 'Luxury', 'Minimal'],
  },
  {
    q: 'What matters most to you?',
    options: ['Budget', 'Speed', 'Premium Finish', 'Storage', 'Sustainability'],
  },
  {
    q: 'Project scope',
    options: ['One room', 'Kitchen/Bath', 'Full home', 'Renovation', 'Staging'],
  },
]

export default function StyleQuizClient() {
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const result = useMemo(() => {
    const a0 = answers[0]
    if (!a0) return null
    if (a0 === 'Modern' || a0 === 'Minimal' || a0 === 'Scandinavian') return 'Contemporary'
    if (a0 === 'Luxury') return 'Luxury'
    return 'Classic'
  }, [answers])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-xl font-semibold text-gray-900">Design Style Quiz</h3>
      <p className="mt-2 text-sm text-gray-600">Discover your aesthetic and get matched with the right partner.</p>

      <div className="mt-6 space-y-5">
        {QUESTIONS.map((q, idx) => (
          <div key={q.q} className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900">{q.q}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.options.map((o) => {
                const selected = answers[idx] === o
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      setAnswers((p) => ({ ...p, [idx]: o }))
                      trackEvent('ecosystem_tool_use', { tool: 'design_style_quiz', question: idx, answer: o })
                    }}
                    className={
                      selected
                        ? 'rounded-full bg-dark-blue px-4 py-2 text-xs font-semibold text-white'
                        : 'rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                    }
                  >
                    {o}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-semibold text-gray-900">Your Match</div>
          {result ? (
            <div className="mt-1 text-lg font-semibold text-gray-900">{result} Designers</div>
          ) : (
            <div className="mt-1 text-sm text-gray-600">Answer at least the first question to see a match.</div>
          )}
        </div>
      </div>
    </div>
  )
}
