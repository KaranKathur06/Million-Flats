'use client'

import { useState } from 'react'
import type { DeveloperFaqItem } from './types'

type DeveloperFaqsProps = {
  faqs: DeveloperFaqItem[]
  developerName: string
}

export default function DeveloperFaqs({ faqs, developerName }: DeveloperFaqsProps) {
  const [openId, setOpenId] = useState<string | null>(faqs.length > 0 ? faqs[0].id : null)

  if (faqs.length === 0) return null

  return (
    <section className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Common questions about {developerName} and their projects.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-300 ${
                  isOpen ? 'border-primary-200 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left sm:px-6"
                >
                  <span className={`text-sm font-semibold sm:text-base ${isOpen ? 'text-primary-700' : 'text-dark-blue'}`}>
                    {faq.question}
                  </span>
                  <svg
                    className={`ml-4 h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-primary-600' : 'text-gray-400'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="border-t border-gray-100 px-5 pb-5 pt-3 sm:px-6">
                    <p className="text-sm leading-7 text-gray-600 sm:text-base">{faq.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
