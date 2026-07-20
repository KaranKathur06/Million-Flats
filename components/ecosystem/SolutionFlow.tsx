import React from 'react'

type Step = { title: string; detail: string }

export default function SolutionFlow({ steps }: { steps: Step[] }) {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">How MillionFlats Helps</h3>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">Our proven process to connect you with the right partners and deliver projects on time.</p>
        </div>

        <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-8">
          <div className="hidden md:block absolute left-8 right-8 top-1/2 h-0.5 bg-slate-100 transform -translate-y-1/2" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="flex-1 min-w-0">
                <div className="flex items-start md:items-center gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center text-lg font-extrabold shadow-lg">
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{s.title}</h4>
                    <p className="mt-2 text-slate-600">{s.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
