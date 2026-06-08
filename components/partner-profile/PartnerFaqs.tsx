'use client'

import { useState } from 'react'
import type { PartnerFaqItem } from './types'

type PartnerFaqsProps = {
  faqs: PartnerFaqItem[]
  partnerName: string
}

export default function PartnerFaqs({ faqs, partnerName }: PartnerFaqsProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id || null)

  if (faqs.length === 0) return null

  return (
    <section className="bg-gray-50 py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Frequently Asked Questions</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">Common questions about working with {partnerName}.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => {
            const open = openId === faq.id
            return (
              <div key={faq.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-dark-blue sm:text-base">{faq.question}</span>
                  <span className="text-xl text-gray-400">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="border-t border-gray-100 px-5 py-4 text-sm leading-7 text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
