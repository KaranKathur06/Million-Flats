import type { PartnerProcessStep } from './types'

type PartnerProcessProps = {
  steps: PartnerProcessStep[]
  partnerName: string
}

export default function PartnerProcess({ steps, partnerName }: PartnerProcessProps) {
  if (steps.length === 0) return null

  return (
    <section id="partner-process" className="scroll-mt-28 py-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">How it works</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          Working with {partnerName}
        </h2>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li
            key={`${step.step}-${step.title}`}
            className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[#1e3a5f]">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
