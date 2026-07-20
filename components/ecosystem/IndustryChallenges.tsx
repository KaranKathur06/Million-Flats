import React from 'react'

type Challenge = { title: string; solution: string }

export default function IndustryChallenges({ challenges }: { challenges: Challenge[] }) {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-2xl font-extrabold text-slate-900 mb-4">Industry Challenges</h3>
        <p className="text-slate-700 mb-8">Common problems faced by developers, suppliers and buyers — and how MillionFlats solves them.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {challenges.map((c) => (
            <div key={c.title} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900">{c.title}</h4>
              <p className="mt-3 text-slate-600">{c.solution}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
