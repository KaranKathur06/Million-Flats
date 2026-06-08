import type { PartnerProcessStep } from './types'

type PartnerProcessProps = {
  steps: PartnerProcessStep[]
  partnerName: string
}

export default function PartnerProcess({ steps, partnerName }: PartnerProcessProps) {
  return (
    <section className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Work Process</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">How {partnerName} delivers your project.</p>
        </div>
        <div className="relative">
          <div className="absolute left-6 top-0 hidden h-full w-0.5 bg-gradient-to-b from-dark-blue/30 to-gray-200 lg:left-1/2 lg:-ml-px lg:block" />
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div
                key={step.step}
                className={`relative flex flex-col gap-4 lg:flex-row lg:items-center ${
                  idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}
              >
                <div className={`flex-1 ${idx % 2 === 0 ? 'lg:pr-12 lg:text-right' : 'lg:pl-12'}`}>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-dark-blue">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{step.description}</p>
                  </div>
                </div>
                <div className="relative z-10 mx-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dark-blue bg-white text-lg font-bold text-dark-blue shadow-md lg:mx-0">
                  {step.step}
                </div>
                <div className="hidden flex-1 lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
