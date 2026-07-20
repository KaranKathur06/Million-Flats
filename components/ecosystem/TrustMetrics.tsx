import React from 'react'

type Metric = { value: string; label: string }

export default function TrustMetrics({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="mt-8 w-full">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white/90 rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{m.value}</div>
              <div className="mt-2 text-sm text-slate-600">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
