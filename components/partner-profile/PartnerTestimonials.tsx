'use client'

import { useState } from 'react'
import type { PartnerReviewItem } from './types'

type PartnerTestimonialsProps = {
  reviews: PartnerReviewItem[]
  partnerName: string
}

export default function PartnerTestimonials({ reviews, partnerName }: PartnerTestimonialsProps) {
  const [index, setIndex] = useState(0)

  if (reviews.length === 0) return null

  const current = reviews[index]

  return (
    <section className="bg-dark-blue py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Client Testimonials</h2>
          <p className="mt-2 text-sm text-white/70 sm:text-base">What clients say about {partnerName}.</p>
        </div>

        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="flex gap-1 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i}>{i < Math.floor(current.rating || 5) ? '★' : '☆'}</span>
            ))}
          </div>
          <blockquote className="mt-4 text-base leading-7 text-white/90 sm:text-lg">
            &ldquo;{current.review}&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">{current.reviewerName}</div>
              <div className="text-sm text-white/60">
                {[current.location, current.projectType].filter(Boolean).join(' · ')}
              </div>
            </div>
            {reviews.length > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i - 1 + reviews.length) % reviews.length)}
                  className="rounded-xl border border-white/20 px-3 py-2 text-white hover:bg-white/10"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i + 1) % reviews.length)}
                  className="rounded-xl border border-white/20 px-3 py-2 text-white hover:bg-white/10"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
