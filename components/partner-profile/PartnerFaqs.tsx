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
    <section id="partner-faqs" className="scroll-mt-28 py-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">More information</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          Frequently asked questions
        </h2>
        <p className="mt-1 text-sm text-slate-600">Answers provided by {partnerName}.</p>
      </div>
      <div className="space-y-3">
        {faqs.map((faq) => {
          const open = openId === faq.id
          return (
            <div key={faq.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : faq.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-[#1e3a5f] sm:text-base">{faq.question}</span>
                <span aria-hidden="true" className="text-xl text-slate-400">{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600">
                  {faq.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
